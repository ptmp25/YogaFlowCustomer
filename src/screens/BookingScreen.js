import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {getUserBookings, cancelBooking} from '../services/classService';

const formatDateObject = date => {
  if (!date || typeof date !== 'object') return 'Date not set';
  const day = String(date.dayOfMonth).padStart(2, '0');
  const month = String(date.monthValue).padStart(2, '0');
  const year = date.year;
  const weekday = date.dayOfWeek;
  return `${weekday}, ${day}/${month}/${year}`;
};

const getJSDateFromFirebaseDate = dateObj => {
  if (!dateObj) return null;
  return new Date(dateObj.year, dateObj.monthValue - 1, dateObj.dayOfMonth);
};

// Function to extract time string from booking data
const getTimeString = booking => {
  // Check multiple possible locations for time information

  // Check for startTime (from CheckoutScreen)
  if (booking.startTime) return booking.startTime;

  // Check if there's a timeString directly in the booking
  if (booking.timeString) return booking.timeString;

  // Check if there's a time field in booking
  if (booking.time) return booking.time;

  // Check if there's a time in classDetails
  if (booking.classDetails?.time) return booking.classDetails.time;

  // Check if there's a time in courseInfo
  if (booking.classDetails?.courseInfo?.time)
    return booking.classDetails.courseInfo.time;

  // Check if time is in courseInfo at root level
  if (booking.courseInfo?.time) return booking.courseInfo.time;

  // Check if there's a bookingTime field
  if (booking.bookingTime) return booking.bookingTime;

  // Check if we have any hours/minutes in the classDate object
  if (
    booking.classDetails?.date?.hour !== undefined &&
    booking.classDetails?.date?.minute !== undefined
  ) {
    const hour = booking.classDetails.date.hour;
    const minute = String(booking.classDetails.date.minute).padStart(2, '0');
    return `${hour}:${minute}`;
  }

  // Check if we have hours/minutes in a direct classDate object
  if (
    booking.classDate?.hour !== undefined &&
    booking.classDate?.minute !== undefined
  ) {
    const hour = booking.classDate.hour;
    const minute = String(booking.classDate.minute).padStart(2, '0');
    return `${hour}:${minute}`;
  }

  // If bookingDate exists, try to extract time from it
  if (booking.bookingDate && typeof booking.bookingDate === 'string') {
    try {
      const date = new Date(booking.bookingDate);
      return date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
    } catch (e) {
      console.log('Error parsing bookingDate:', e);
    }
  }

  // Default fallback
  return 'TBA';
};

const BookingsScreen = ({navigation}) => {
  const [activeBookings, setActiveBookings] = useState([]);
  const [pastBookings, setPastBookings] = useState([]);
  const [cancelledBookings, setCancelledBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);``
  const [cancellingBookingId, setCancellingBookingId] = useState(null);

  // Inside BookingsScreen.js
  const loadBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      const allBookings = await getUserBookings();

      // Debug log
      console.log(`Loaded ${allBookings.length} bookings`);

      const now = new Date();
      now.setHours(0, 0, 0, 0);

      const active = [];
      const past = [];
      const cancelled = [];

      allBookings.forEach(booking => {
        // Get date from either classDetails.date or classDate
        const dateObj = booking.classDetails?.date || booking.classDate;

        if (!dateObj) {
          console.log(
            `Booking ${booking.id || 'unknown'} missing date information`,
          );
          return;
        }

        const classDate = getJSDateFromFirebaseDate(dateObj);
        if (!classDate) {
          console.log(`Booking ${booking.id || 'unknown'} has invalid date`);
          return;
        }

        // Check if booking is cancelled
        const isCancelled = (booking.status || '').toLowerCase() === 'cancelled';

        // If cancelled, add to cancelled list regardless of date
        if (isCancelled) {
          cancelled.push(booking);
          return;
        }

        // Add cancellation eligibility flag for active bookings
        const hoursTillClass =
          (classDate.getTime() - new Date().getTime()) / (1000 * 60 * 60);
        booking.canCancel =
          hoursTillClass > 24 &&
          booking.status &&
          booking.status.toLowerCase() === 'confirmed';

        // Sort non-cancelled bookings by date
        if (classDate >= now) {
          active.push(booking);
        } else {
          past.push(booking);
        }
      });

      // Sort active bookings by date (soonest first)
      active.sort((a, b) => {
        const dateA = getJSDateFromFirebaseDate(
          a.classDetails?.date || a.classDate,
        );
        const dateB = getJSDateFromFirebaseDate(
          b.classDetails?.date || b.classDate,
        );
        return dateA - dateB;
      });

      // Sort past bookings by date (most recent first)
      past.sort((a, b) => {
        const dateA = getJSDateFromFirebaseDate(
          a.classDetails?.date || a.classDate,
        );
        const dateB = getJSDateFromFirebaseDate(
          b.classDetails?.date || b.classDate,
        );
        return dateB - dateA;
      });

      // Sort cancelled bookings by cancellation date (most recent first)
      cancelled.sort((a, b) => {
        const dateA = a.cancelledAt ? new Date(a.cancelledAt) : new Date(0);
        const dateB = b.cancelledAt ? new Date(b.cancelledAt) : new Date(0);
        return dateB - dateA;
      });

      console.log(
        `Split into ${active.length} active, ${past.length} past, and ${cancelled.length} cancelled bookings`,
      );
      setActiveBookings(active);
      setPastBookings(past);
      setCancelledBookings(cancelled);
    } catch (err) {
      console.error('Error loading bookings:', err);
      setError('Failed to load bookings. Pull down to refresh.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCancelBooking = booking => {
    // Check if booking can be cancelled (24-hour policy)
    if (!booking.canCancel) {
      const dateObj = booking.classDetails?.date || booking.classDate;
      const classDate = getJSDateFromFirebaseDate(dateObj);
      const hoursTillClass =
        (classDate.getTime() - new Date().getTime()) / (1000 * 60 * 60);

      if (hoursTillClass <= 24) {
        Alert.alert(
          'Cannot Cancel',
          'Bookings must be cancelled at least 24 hours before the class starts.',
          [{text: 'OK'}],
        );
        return;
      } else if ((booking.status || '').toLowerCase() !== 'confirmed') {
        Alert.alert(
          'Cannot Cancel',
          `This booking cannot be cancelled because its status is "${
            booking.status || 'unknown'
          }".`,
          [{text: 'OK'}],
        );
        return;
      }
    }

    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking? This action cannot be undone.',
      [
        {text: 'No', style: 'cancel'},
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              setCancellingBookingId(booking.id);
              await cancelBooking(booking.id);

              Alert.alert(
                'Booking Cancelled',
                'Your booking has been successfully cancelled.',
                [{text: 'OK'}],
              );

              await loadBookings();
            } catch (err) {
              console.error('Error canceling booking:', err);
              Alert.alert(
                'Error',
                'Failed to cancel booking. Please try again.',
              );
            } finally {
              setCancellingBookingId(null);
            }
          },
        },
      ],
    );
  };

  useFocusEffect(
    useCallback(() => {
      loadBookings();
    }, []),
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadBookings();
  };

  const getStatusStyle = status => {
    const statusLower = (status || '').toLowerCase();
    switch (statusLower) {
      case 'confirmed':
        return {color: '#6B8E23'};
      case 'cancelled':
        return {color: '#d32f2f'};
      case 'completed':
        return {color: '#1976d2'};
      case 'waitlisted':
        return {color: '#FF8C00'};
      default:
        return {color: '#757575'};
    }
  };

  const renderBooking = ({item}) => {
    // Get date from either classDetails.date or classDate
    const dateObj = item.classDetails?.date || item.classDate;
    const classDate = getJSDateFromFirebaseDate(dateObj);

    const isPast = classDate < new Date().setHours(0, 0, 0, 0);
    const iscancelled = (item.status || '').toLowerCase() === 'cancelled';
    const isConfirmed = (item.status || '').toLowerCase() === 'confirmed';

    // Calculate if booking is within 24 hours
    const hoursTillClass =
      (classDate.getTime() - new Date().getTime()) / (1000 * 60 * 60);
    const isWithin24Hours = hoursTillClass <= 24;

    // Get time string using our helper function
    const timeString = getTimeString(item);

    // Get class name from either classDetails.className, className or title
    const className =
      item.classDetails?.className ||
      item.className ||
      item.title ||
      'Yoga Class';

    // Get class type from either classDetails.courseInfo.type or courseInfo.type
    const classType =
      item.classDetails?.courseInfo?.type || item.courseInfo?.type || 'Yoga';

    // Get teacher from either classDetails.teacher or teacher
    const teacher = item.classDetails?.teacher || item.teacher || 'TBA';

    // Get room from either classDetails.room or room
    const room = item.classDetails?.room || item.room || 'TBA';

    // Get duration from either classDetails.courseInfo.duration or courseInfo.duration
    const duration =
      item.classDetails?.courseInfo?.duration ||
      item.courseInfo?.duration ||
      '?';

    // Get price from either classDetails.courseInfo.price or courseInfo.price
    const price =
      item.classDetails?.courseInfo?.price || item.courseInfo?.price || 0;

    return (
      <View
        style={[
          styles.card,
          iscancelled && styles.cancelledCard,
          isConfirmed && isWithin24Hours && styles.upcomingCard,
        ]}>
        {iscancelled && (
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>Cancelled</Text>
          </View>
        )}

        {isConfirmed && isWithin24Hours && !isPast && (
          <View style={styles.upcomingBadge}>
            <Text style={styles.upcomingBadgeText}>Within 24h</Text>
          </View>
        )}

        <Text style={[styles.courseName, iscancelled && styles.cancelledText]}>
          {className} ({classType})
        </Text>

        <Text style={styles.detailText}>📅 {formatDateObject(dateObj)}</Text>

        <Text style={styles.detailText}>⏰ Time: {timeString}</Text>
        <Text style={styles.detailText}>👤 Instructor: {teacher}</Text>
        <Text style={styles.detailText}>📍 Room: {room}</Text>

        <Text style={styles.detailText}>
          ⏳ Duration: {duration} {duration === 1 ? 'min' : 'mins'}
        </Text>

        <Text style={styles.detailText}>💵 Price: £{price}</Text>

        <Text style={[styles.status, getStatusStyle(item.status)]}>
          Status:{' '}
          {(item.status || 'Unknown').charAt(0).toUpperCase() +
            (item.status || 'Unknown').slice(1)}
        </Text>

        {item.cancelledAt && (
          <Text style={styles.cancellationInfo}>
            Cancelled on: {new Date(item.cancelledAt).toLocaleString()}
          </Text>
        )}

        {!isPast && isConfirmed && (
          <>
            <TouchableOpacity
              style={[
                styles.cancelButton,
                (!item.canCancel || cancellingBookingId === item.id) &&
                  styles.disabledButton,
              ]}
              onPress={() => handleCancelBooking(item)}
              disabled={!item.canCancel || cancellingBookingId === item.id}>
              {cancellingBookingId === item.id ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.cancelButtonText}>Cancel Booking</Text>
              )}
            </TouchableOpacity>

            {isWithin24Hours && (
              <Text style={styles.cancellationWarning}>
                Cannot cancel - within 24 hours of class time
              </Text>
            )}
          </>
        )}
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6B8E23" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>
      <Text style={styles.title}>My Bookings</Text>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {activeBookings.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Upcoming Classes</Text>
          <FlatList
            data={activeBookings}
            keyExtractor={item => item.id || String(Math.random())}
            renderItem={renderBooking}
            scrollEnabled={false}
          />
        </>
      ) : (
        <Text style={styles.emptyText}>No upcoming bookings.</Text>
      )}

      {cancelledBookings.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, styles.cancelledSectionTitle]}>
            Cancelled Bookings
          </Text>
          <FlatList
            data={cancelledBookings}
            keyExtractor={item => item.id || String(Math.random())}
            renderItem={renderBooking}
            scrollEnabled={false}
          />
        </>
      )}

      {pastBookings.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Past Classes</Text>
          <FlatList
            data={pastBookings}
            keyExtractor={item => item.id || String(Math.random())}
            renderItem={renderBooking}
            scrollEnabled={false}
          />
        </>
      ) : (
        <Text style={styles.emptyText}>No past bookings.</Text>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    padding: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6B8E23',
    marginTop: 20,
    marginBottom: 10,
  },
  cancelledSectionTitle: {
    color: '#d32f2f',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    position: 'relative',
  },
  cancelledCard: {
    opacity: 0.8,
    borderLeftWidth: 4,
    borderLeftColor: '#d32f2f',
    backgroundColor: '#ffebee',
  },
  upcomingCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF8C00',
  },
  courseName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
  cancelledText: {
    textDecorationLine: 'line-through',
    color: '#888',
  },
  status: {
    marginTop: 10,
    fontWeight: 'bold',
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
    fontStyle: 'italic',
    marginTop: 10,
  },
  errorText: {
    fontSize: 14,
    color: '#d32f2f',
    marginBottom: 10,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  cancelButton: {
    marginTop: 10,
    backgroundColor: '#d32f2f',
    paddingVertical: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#aaa',
  },
  cancelButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  cancellationWarning: {
    color: '#d32f2f',
    fontSize: 12,
    marginTop: 5,
    fontStyle: 'italic',
  },
  cancellationInfo: {
    color: '#666',
    fontSize: 12,
    marginTop: 5,
    fontStyle: 'italic',
  },
  statusBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#d32f2f',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderTopRightRadius: 10,
    borderBottomLeftRadius: 10,
  },
  statusBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  upcomingBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#FF8C00',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderTopRightRadius: 10,
    borderBottomLeftRadius: 10,
  },
  upcomingBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default BookingsScreen;
