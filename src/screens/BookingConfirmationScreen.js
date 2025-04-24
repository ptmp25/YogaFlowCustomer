// src/screens/BookingConfirmationScreen.js
import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {auth, database} from '../firebase/config';
import {ref, update, get} from 'firebase/database';

const formatDateObject = date => {
  if (!date || typeof date !== 'object') return 'Date not set';

  const day = String(date.dayOfMonth).padStart(2, '0');
  const month = String(date.monthValue).padStart(2, '0');
  const year = date.year;
  const weekday = date.dayOfWeek;

  return `${weekday}, ${day}/${month}/${year}`;
};

const BookingConfirmationScreen = ({route, navigation}) => {
  const {classData} = route.params;
  const [loading, setLoading] = useState(false);

  const handleConfirmBooking = async () => {
    if (!auth.currentUser) {
      Alert.alert('Error', 'You must be logged in to book a class');
      return;
    }

    if (classData.availableSlots <= 0) {
      Alert.alert('Sorry', 'This class is fully booked.');
      return;
    }

    setLoading(true);
    try {
      const classRef = ref(database, `classes/${classData.id}`);
      const snapshot = await get(classRef);
      const currentClassData = snapshot.val();

      if (!currentClassData || currentClassData.availableSlots <= 0) {
        Alert.alert('Sorry', 'This class is no longer available.');
        setLoading(false);
        return;
      }

      // ✅ Prevent duplicate bookings
      const allBookingsRef = ref(database, 'bookings');
      const allBookingsSnap = await get(allBookingsRef);
      const allBookings = allBookingsSnap.val();

      const hasBooked = Object.values(allBookings || {}).some(
        booking =>
          booking.userId === auth.currentUser.uid &&
          booking.classId === classData.id,
      );

      if (hasBooked) {
        Alert.alert('Already Booked', 'You have already booked this class.', [
          {
            text: 'Go to Bookings',
            onPress: () => navigation.navigate('BookingsTab'),
          },
        ]);
        setLoading(false);
        return;
      }

      const bookingData = {
        classId: classData.id,
        userId: auth.currentUser.uid,
        bookingDate: new Date().toISOString(),
        className: `Yoga Class ${classData.courseId || 'Unknown'}`,
        classDate: classData.date,
        status: 'confirmed',
      };

      const bookingId = Date.now().toString();
      const updates = {};
      updates[`classes/${classData.id}/availableSlots`] =
        currentClassData.availableSlots - 1;
      updates[`bookings/${bookingId}`] = bookingData;

      await update(ref(database), updates);

      Alert.alert(
        'Booking Confirmed',
        'Your class has been booked successfully!',
        [
          {
            text: 'View Bookings',
            onPress: () => navigation.navigate('BookingsTab'),
          },
          {
            text: 'Back to Classes',
            onPress: () =>
              navigation.navigate('CourseClasses', {
                courseId: classData.courseId,
                courseTitle: `Course ${classData.courseId}`,
              }),
          },
        ],
      );
    } catch (error) {
      console.error('Booking error:', error);
      Alert.alert('Error', 'Failed to book class. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Booking Confirmation</Text>
        <View style={styles.classDetails}>
          <Text style={styles.className}>
            Yoga Class {classData.courseId || 'Unknown'}
          </Text>
          <Text style={styles.dateTime}>{formatDateObject(classData.date)}</Text>
          <Text style={styles.instructor}>Instructor: {classData.teacher}</Text>
          <Text style={styles.location}>Location: {classData.room}</Text>
          <Text style={styles.availableSlots}>
            Available Slots: {classData.availableSlots}
          </Text>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            You're about to book a spot in this class. Once confirmed, you can
            view or cancel this booking from your bookings page.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.confirmButton}
          onPress={handleConfirmBooking}
          disabled={loading || classData.availableSlots <= 0}>
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.confirmButtonText}>
              {classData.availableSlots > 0 ? 'Confirm Booking' : 'Class Full'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          disabled={loading}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    padding: 20,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  classDetails: {
    marginBottom: 20,
  },
  className: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  dateTime: {
    fontSize: 16,
    color: '#555',
    marginBottom: 8,
  },
  instructor: {
    fontSize: 16,
    color: '#555',
    marginBottom: 5,
  },
  location: {
    fontSize: 16,
    color: '#555',
    marginBottom: 5,
  },
  availableSlots: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6B8E23',
    marginTop: 5,
  },
  infoBox: {
    backgroundColor: '#f0f8ff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  infoText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  confirmButton: {
    backgroundColor: '#6B8E23',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#555',
    fontSize: 16,
  },
});

export default BookingConfirmationScreen;
