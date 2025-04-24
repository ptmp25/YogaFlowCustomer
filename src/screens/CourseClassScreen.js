// Import necessary libraries and components from React and React Native
import React, {useState, useEffect, useContext} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';

// Import Firebase database functions for querying data
import {ref, query, orderByChild, equalTo, get} from 'firebase/database';

// Import Firebase configuration and authentication
import {database, auth} from '../firebase/config';

// Import custom CartContext to manage global cart state
import {CartContext} from '../context/CartContext';

// Functional component for displaying all classes under a selected course
const CourseClassesScreen = ({route, navigation}) => {
  // Extract course ID and name passed via navigation parameters
  const courseId = route?.params?.courseId;
  const courseName = route?.params?.courseName || 'Course Classes';

  // Define state variables to hold:
  // - classes: categorized into upcoming and past
  // - loading: indicates whether data is still being fetched
  // - error: stores any error message
  // - userBookings: list of class IDs the user has already booked
  // - courseInfo: detailed info about the selected course
  const [classes, setClasses] = useState({upcoming: [], past: []});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userBookings, setUserBookings] = useState([]);
  const [courseInfo, setCourseInfo] = useState(null);

  // Use CartContext to access cart-related functions and data
  const {addToCart, removeFromCart, cartItems} = useContext(CartContext);

  // Lifecycle method equivalent to componentDidMount – called once when the component is rendered
  useEffect(() => {
    // Dynamically set the screen title to the course name
    navigation.setOptions({title: courseName});

    // If courseId is missing, show error and stop further processing
    if (!courseId) {
      setError('Missing course ID');
      setLoading(false);
      return;
    }

    // Fetch required data for rendering the screen
    const fetchData = async () => {
      try {
        // Parallel fetching of class list and course details
        await Promise.all([fetchClasses(), fetchCourseInfo()]);

        // If the user is authenticated, also fetch their booking history
        if (auth.currentUser) {
          await fetchUserBookings();
        }
      } catch (err) {
        console.error('Error loading data:', err);
      }
    };

    fetchData();
  }, [courseId]);

  // Fetch all bookings made by the currently signed-in user
  const fetchUserBookings = async () => {
    try {
      const bookingsRef = ref(database, 'bookings');
      const snapshot = await get(bookingsRef);
      if (snapshot.exists()) {
        const bookings = [];
        snapshot.forEach(child => {
          const booking = child.val();
          if (booking.userId === auth.currentUser.uid) {
            bookings.push(booking.classId); // Collect only class IDs
          }
        });
        setUserBookings(bookings);
      }
    } catch (err) {
      console.error('Booking fetch error:', err);
    }
  };

  // Fetch all classes that belong to the given course ID from the Firebase Realtime Database
  const fetchClasses = async () => {
    setLoading(true);
    try {
      // Create a Firebase query to filter classes where courseId matches the selected course
      const q = query(
        ref(database, 'classes'),
        orderByChild('courseId'),
        equalTo(Number(courseId)),
      );
      const snapshot = await get(q);

      const now = new Date();
      const upcoming = [];
      const past = [];

      // Iterate through each class and categorize as past or upcoming
      snapshot.forEach(child => {
        const cls = {id: child.key, ...child.val()};
        const date = getJSDateFromFirebaseDate(cls.date);
        if (!date) return;
        if (date >= now.setHours(0, 0, 0, 0)) {
          upcoming.push(cls);
        } else {
          past.push(cls);
        }
      });

      // Sort upcoming classes in ascending order (nearest first)
      upcoming.sort(
        (a, b) =>
          getJSDateFromFirebaseDate(a.date) - getJSDateFromFirebaseDate(b.date),
      );

      // Sort past classes in descending order (most recent first)
      past.sort(
        (a, b) =>
          getJSDateFromFirebaseDate(b.date) - getJSDateFromFirebaseDate(a.date),
      );

      setClasses({upcoming, past});
    } catch (err) {
      setError('Failed to load classes.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Retrieve detailed information for the selected course
  const fetchCourseInfo = async () => {
    try {
      const courseRef = ref(database, `courses/${courseId}`);
      const snapshot = await get(courseRef);
      if (snapshot.exists()) {
        setCourseInfo(snapshot.val());
      }
    } catch (err) {
      console.error('Course info fetch error:', err);
    }
  };

  // Helper function to convert a Firebase date object to a JavaScript Date object
  const getJSDateFromFirebaseDate = dateObj => {
    if (!dateObj) return null;
    return new Date(dateObj.year, dateObj.monthValue - 1, dateObj.dayOfMonth);
  };

  // Helper function to format the date for display (dd/mm/yyyy)
  const formatClassDate = dateObj => {
    if (!dateObj) return 'No date';
    const d = dateObj.dayOfMonth.toString().padStart(2, '0');
    const m = dateObj.monthValue.toString().padStart(2, '0');
    return `${d}/${m}/${dateObj.year}`;
  };

  // Check if the user has already booked the class
  const isClassBooked = classId => userBookings.includes(classId);

  // Check if the class is already in the cart
  const isInCart = classId =>
    cartItems.some(item => String(item.id) === String(classId));

  // Handle the logic when a user wants to add a class to the cart
  const handleAddToCart = item => {
    // Prevent adding if already booked
    if (isClassBooked(item.id)) {
      Alert.alert('Already Booked', 'You have already booked this class');
      return;
    }

    // Prevent adding past classes
    const isPast =
      getJSDateFromFirebaseDate(item.date) < new Date().setHours(0, 0, 0, 0);
    if (isPast) {
      Alert.alert('Cannot Add', 'This class has already ended');
      return;
    }

    // Prevent adding if class is full
    if (item.availableSlots <= 0) {
      Alert.alert('Class Full', 'This class is fully booked');
      return;
    }

    // Prepare class object to be added to cart
    const classForCart = {
      id: item.id,
      title: `${courseName} Class`,
      date: formatClassDate(item.date),
      time: item.startTime
        ? `${item.startTime.hour}:${String(item.startTime.minute).padStart(
            2,
            '0',
          )}`
        : 'TBA',
      instructor: item.teacher || 'TBA',
      room: item.room || 'TBA',
      availableSlots: item.availableSlots,
      courseId: item.courseId,
    };

    // Add to cart and display appropriate message
    const added = addToCart(classForCart);
    if (added) {
      Alert.alert('Added to Cart', 'Class added to your cart', [
        {text: 'Continue', style: 'cancel'},
        {text: 'Go to Cart', onPress: () => navigation.navigate('CartTab')},
      ]);
    } else {
      Alert.alert('Already in Cart', 'This class is already in your cart');
    }
  };

  // Render the top section with detailed course information
  const renderCourseHeader = () => {
    if (!courseInfo) return null;

    return (
      <View style={styles.courseHeader}>
        <Text style={styles.courseHeaderTitle}>{courseInfo.name}</Text>
        <Text style={styles.courseHeaderSubtitle}>{courseInfo.type}</Text>
        <Text style={styles.courseHeaderDetail}>{courseInfo.description}</Text>
        <View style={styles.courseMetaRow}>
          <Text style={styles.courseMeta}>Time: {courseInfo.time}</Text>
          <Text style={styles.courseMeta}>
            Duration: {courseInfo.duration} hr
          </Text>
          <Text style={styles.courseMeta}>Capacity: {courseInfo.capacity}</Text>
        </View>
        <Text style={styles.coursePrice}>Price: £{courseInfo.price}</Text>
      </View>
    );
  };

  // Render a single class item card (used for both past and upcoming classes)
  const renderClassItem = ({item}) => {
    const isPast =
      getJSDateFromFirebaseDate(item.date) < new Date().setHours(0, 0, 0, 0);
    const booked = isClassBooked(item.id);
    const inCart = isInCart(item.id);

    return (
      <View style={styles.card}>
        <Text style={styles.courseName}>{formatClassDate(item.date)}</Text>
        <Text style={styles.detailText}>
          Instructor: {item.teacher || 'TBA'}
        </Text>
        <Text style={styles.detailText}>Room: {item.room || 'TBA'}</Text>
        <Text style={styles.detailText}>
          {booked
            ? 'You have booked this class'
            : inCart
            ? 'In Cart'
            : item.availableSlots > 0
            ? `${item.availableSlots} spots left`
            : 'Full'}
        </Text>

        {/* Display button depending on status: booked, in cart, or addable */}
        {booked ? (
          <View style={styles.bookedButton}>
            <Text style={styles.bookedButtonText}>Already Booked</Text>
          </View>
        ) : inCart ? (
          <TouchableOpacity
            style={styles.removeFromCartButton}
            onPress={() => removeFromCart(item.id)}>
            <Text style={styles.removeFromCartButtonText}>
              Remove from Cart
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.addToCartButton,
              (item.availableSlots <= 0 || isPast) && styles.disabledButton,
            ]}
            onPress={() => handleAddToCart(item)}
            disabled={item.availableSlots <= 0 || isPast}>
            <Text style={styles.addToCartButtonText}>
              {isPast
                ? 'Class Ended'
                : item.availableSlots > 0
                ? 'Add to Cart'
                : 'Full'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Render loading indicator while data is being fetched
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6B8E23" />
      </View>
    );
  }

  // Render error message if something went wrong
  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            fetchClasses();
            fetchCourseInfo();
            if (auth.currentUser) fetchUserBookings();
          }}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Final render logic: show header and list of classes (upcoming and past)
  return (
    <ScrollView style={styles.container}>
      {renderCourseHeader()}

      {classes.upcoming.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Upcoming Classes</Text>
          <FlatList
            data={classes.upcoming}
            keyExtractor={item => item.id.toString()}
            renderItem={renderClassItem}
            scrollEnabled={false} // FlatList nested inside ScrollView
          />
        </>
      )}

      {classes.past.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Past Classes</Text>
          <FlatList
            data={classes.past}
            keyExtractor={item => item.id.toString()}
            renderItem={renderClassItem}
            scrollEnabled={false}
          />
        </>
      )}

      {/* Case when no classes are available */}
      {classes.upcoming.length === 0 && classes.past.length === 0 && (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>
            No classes available for this course.
          </Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Back to Courses</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f8f8f8', padding: 15},
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  courseHeader: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
  },
  courseHeaderTitle: {fontSize: 20, fontWeight: 'bold', color: '#333'},
  courseHeaderSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B8E23',
    marginTop: 5,
  },
  courseHeaderDetail: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  courseMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  courseMeta: {fontSize: 13, color: '#444'},
  coursePrice: {
    marginTop: 10,
    fontSize: 14,
    color: '#fb8c00',
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6B8E23',
    marginTop: 20,
    marginBottom: 10,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
  },
  courseName: {fontSize: 16, fontWeight: 'bold', marginBottom: 8},
  detailText: {fontSize: 14, color: '#555', marginBottom: 4},
  addToCartButton: {
    backgroundColor: '#6B8E23',
    paddingVertical: 10,
    borderRadius: 5,
    marginTop: 10,
    alignItems: 'center',
  },
  disabledButton: {backgroundColor: '#ccc'},
  addToCartButtonText: {color: '#fff', fontWeight: 'bold'},
  removeFromCartButton: {
    backgroundColor: '#ff5722',
    paddingVertical: 10,
    borderRadius: 5,
    marginTop: 10,
    alignItems: 'center',
  },
  removeFromCartButtonText: {color: '#fff', fontWeight: 'bold'},
  bookedButton: {
    backgroundColor: '#4a90e2',
    paddingVertical: 10,
    borderRadius: 5,
    marginTop: 10,
    alignItems: 'center',
  },
  bookedButtonText: {color: '#fff', fontWeight: 'bold'},
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 15,
  },
  retryButton: {
    backgroundColor: '#6B8E23',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  retryButtonText: {color: '#fff', fontWeight: 'bold'},
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#6B8E23',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  backButtonText: {color: '#fff', fontWeight: 'bold'},
});

export default CourseClassesScreen;
