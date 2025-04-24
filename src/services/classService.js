// src/services/classService.js
import {
  get,
  query,
  orderByChild,
  equalTo,
  push,
  update,
  remove,
  ref,
} from 'firebase/database';
import {database, auth} from '../firebase/config';
import {parse, format} from 'date-fns';

const classesRef = ref(database, 'classes');
const bookingsRef = ref(database, 'bookings');
const coursesRef = ref(database, 'courses');

// Get all available classes
export const getClasses = async () => {
  try {
    const snapshot = await get(classesRef);
    const classes = [];

    if (snapshot.exists()) {
      snapshot.forEach(childSnapshot => {
        classes.push({
          id: childSnapshot.key,
          ...childSnapshot.val(),
        });
      });
    }

    return classes;
  } catch (error) {
    console.error('Error fetching classes:', error);
    throw error;
  }
};

// Get a specific class by ID
export const getClassById = async classId => {
  try {
    const classRef = ref(database, `classes/${classId}`);
    const snapshot = await get(classRef);

    if (!snapshot.exists()) {
      throw new Error('Class not found');
    }

    return {
      id: snapshot.key,
      ...snapshot.val(),
    };
  } catch (error) {
    console.error('Error fetching class:', error);
    throw error;
  }
};

// Get a specific course by ID
export const getCourseById = async courseId => {
  try {
    if (!courseId) return null;

    const courseRef = ref(database, `courses/${courseId}`);
    const snapshot = await get(courseRef);

    if (!snapshot.exists()) {
      return null;
    }

    return {
      id: snapshot.key,
      ...snapshot.val(),
    };
  } catch (error) {
    console.error('Error fetching course:', error);
    return null;
  }
};

// Search classes by day of week
export const searchClassesByDay = async dayOfWeek => {
  try {
    const allClasses = await getClasses();

    return allClasses.filter(cls => {
      const dateObj = parse(cls.date, 'dd/MM/yyyy', new Date());
      const classDayOfWeek = format(dateObj, 'EEEE').toUpperCase();

      return classDayOfWeek === dayOfWeek.toUpperCase();
    });
  } catch (error) {
    console.error('Error searching classes by day:', error);
    throw error;
  }
};

// Book a class for a user
export const bookClass = async classId => {
  try {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      throw new Error('User must be authenticated to book a class');
    }

    const classData = await getClassById(classId);

    if (!classData || classData.availableSlots <= 0) {
      throw new Error('No available slots for this class');
    }

    // Check if the user already booked this class
    const userBookingsQuery = query(
      bookingsRef,
      orderByChild('userId'),
      equalTo(currentUser.uid),
    );
    const bookingsSnapshot = await get(userBookingsQuery);

    let bookingExists = false;

    if (bookingsSnapshot.exists()) {
      bookingsSnapshot.forEach(childSnapshot => {
        if (childSnapshot.val().classId === classId) {
          bookingExists = true;
        }
      });
    }

    if (bookingExists) {
      throw new Error('You have already booked this class');
    }

    // Create booking
    const newBookingRef = push(bookingsRef);
    await update(newBookingRef, {
      userId: currentUser.uid,
      classId,
      bookingDate: new Date().toISOString(),
      status: 'confirmed',
    });

    // Update available slots
    const classRef = ref(database, `classes/${classId}`);
    await update(classRef, {
      availableSlots: classData.availableSlots - 1,
    });

    return newBookingRef.key;
  } catch (error) {
    console.error('Error booking class:', error);
    throw error;
  }
};

// Get bookings for current user
export const getUserBookings = async () => {
  try {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      return [];
    }

    const bookings = [];

    // Fetch active bookings
    const userActiveBookingsQuery = query(
      bookingsRef,
      orderByChild('userId'),
      equalTo(currentUser.uid),
    );
    const activeSnapshot = await get(userActiveBookingsQuery);

    // Fetch cancelled bookings
    const cancelledBookingsRef = ref(database, 'cancelled_bookings');
    const userCancelledBookingsQuery = query(
      cancelledBookingsRef,
      orderByChild('userId'),
      equalTo(currentUser.uid),
    );
    const cancelledSnapshot = await get(userCancelledBookingsQuery);

    // Process active bookings
    if (activeSnapshot.exists()) {
      for (const childKey of Object.keys(activeSnapshot.val())) {
        const bookingData = activeSnapshot.val()[childKey];
        await processBooking(bookings, childKey, bookingData);
      }
    }

    // Process cancelled bookings
    if (cancelledSnapshot.exists()) {
      for (const childKey of Object.keys(cancelledSnapshot.val())) {
        const bookingData = cancelledSnapshot.val()[childKey];
        await processBooking(bookings, childKey, bookingData);
      }
    }

    console.log(
      `Fetched ${bookings.length} bookings for user ${currentUser.uid} ` +
      `(${activeSnapshot.exists() ? Object.keys(activeSnapshot.val()).length : 0} active, ` +
      `${cancelledSnapshot.exists() ? Object.keys(cancelledSnapshot.val()).length : 0} cancelled)`,
    );

    return bookings;
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    throw error;
  }
};

// Helper function to process a booking and add it to the bookings array
async function processBooking(bookings, childKey, bookingData) {
  try {
    // Get class details if not already in booking
    let classDetails = {};
    if (bookingData.classDetails) {
      classDetails = bookingData.classDetails;
    } else if (bookingData.classId) {
      const classData = await getClassById(bookingData.classId);
      if (classData) {
        classDetails = classData;
      }
    }

    // Get course info
    let courseInfo = {};
    // If courseInfo is at the root level, use it
    if (bookingData.courseInfo) {
      courseInfo = bookingData.courseInfo;
    }
    // If classDetails has courseInfo, use it
    else if (classDetails.courseInfo) {
      courseInfo = classDetails.courseInfo;
    }
    // Otherwise try to fetch from courses collection
    else if (classDetails.courseId) {
      const courseData = await getCourseById(classDetails.courseId);
      if (courseData) {
        courseInfo = {
          name: courseData.name || '',
          type: courseData.type || '',
          duration: courseData.duration || '',
          price: courseData.price || 0,
          time: courseData.time || '',
          description: courseData.description || '',
        };
      }
    }

    // Determine what to use for the date
    let dateInfo = null;
    if (bookingData.classDate) {
      dateInfo = bookingData.classDate;
    } else if (classDetails.date) {
      dateInfo = classDetails.date;
    }

    // Create a unified booking object
    bookings.push({
      id: childKey,
      userId: bookingData.userId,
      classId: bookingData.classId,
      status: bookingData.status || 'confirmed',
      bookingDate: bookingData.bookingDate,
      cancelledAt: bookingData.cancelledAt || null,
      classDetails: {
        ...classDetails,
        courseInfo: courseInfo,
        date: dateInfo,
        room: bookingData.room || classDetails.room || '',
        teacher: bookingData.teacher || classDetails.teacher || '',
        className: bookingData.className || courseInfo.name || 'Class',
      },
    });
  } catch (error) {
    console.error(`Error processing booking ${childKey}:`, error);
  }
}

// Cancel a booking
export const cancelBooking = async bookingId => {
  try {
    const bookingRef = ref(database, `bookings/${bookingId}`);
    const bookingSnapshot = await get(bookingRef);
    const bookingData = bookingSnapshot.val();

    if (!bookingData) throw new Error('Booking not found');

    const classId = bookingData.classId;
    const classRef = ref(database, `classes/${classId}`);
    const classSnapshot = await get(classRef);
    const classData = classSnapshot.val();

    if (!classData) throw new Error('Class not found');

    // Prepare the cancelled booking data
    const cancelledBookingData = {
      ...bookingData,
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
    };

    // Create an updates object for batch updating
    const updates = {};

    // Update the class available slots
    updates[`classes/${classId}/availableSlots`] = classData.availableSlots + 1;

    // Move the booking to the cancelled_bookings collection
    updates[`cancelled_bookings/${bookingId}`] = cancelledBookingData;

    // Remove the booking from the active bookings collection
    updates[`bookings/${bookingId}`] = null;

    // If there are any waitlisted users, we could process them here
    // This would involve checking for waitlisted bookings for this class
    // and upgrading the first one to confirmed status

    // Perform all updates in a single operation
    await update(ref(database), updates);

    console.log(
      `Booking ${bookingId} has been moved to cancelled bookings successfully`,
    );
    return true;
  } catch (error) {
    console.error('Error canceling booking:', error);
    throw error;
  }
};

// Get all classes with course info
export const getClassesWithCourseInfo = async () => {
  try {
    const classes = await getClasses();

    // Get all courses first
    const coursesSnapshot = await get(coursesRef);
    const coursesData = coursesSnapshot.exists() ? coursesSnapshot.val() : {};

    // Enrich each class with its course info
    const enrichedClasses = await Promise.all(
      classes.map(async classItem => {
        let courseInfo = {};

        if (classItem.courseId && coursesData[classItem.courseId]) {
          courseInfo = coursesData[classItem.courseId];
        }

        return {
          ...classItem,
          courseInfo,
        };
      }),
    );

    return enrichedClasses;
  } catch (error) {
    console.error('Error fetching classes with course info:', error);
    throw error;
  }
};
