import React, {useState, useEffect, useContext, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  useRoute,
  useNavigation,
  useFocusEffect,
} from '@react-navigation/native';
import {format} from 'date-fns';
import {getClasses} from '../services/classService';
import {CartContext} from '../context/CartContext';
import {auth, database} from '../firebase/config';
import {ref, get} from 'firebase/database';

const ClassListScreen = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userBookings, setUserBookings] = useState([]);
  const [triggerReload, setTriggerReload] = useState(false);

  const {addToCart, cartItems, getCartCount, removeFromCart} =
    useContext(CartContext);
  const route = useRoute();
  const navigation = useNavigation();
  const {searchDay = '', searchTime = ''} = route.params || {};

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      Promise.all([
        loadClasses(),
        auth.currentUser ? fetchUserBookings() : Promise.resolve(),
      ]).finally(() => {
        setLoading(false);
      });
    }, [cartItems, triggerReload]),
  );

  const fetchUserBookings = async () => {
    try {
      const bookingsRef = ref(database, 'bookings');
      const snapshot = await get(bookingsRef);
      if (snapshot.exists()) {
        const activeBookings = [];
        snapshot.forEach(child => {
          const booking = child.val();
          if (
            booking.userId === auth.currentUser.uid &&
            booking.status !== 'cancelled'
          ) {
            activeBookings.push({
              id: child.key,
              classId: booking.classId,
              status: booking.status || 'active',
            });
          }
        });
        setUserBookings(activeBookings);
      }
    } catch (err) {
      console.error('Error fetching user bookings:', err);
    }
  };

  const loadClasses = async () => {
    try {
      const classesRef = ref(database, 'classes');
      const coursesRef = ref(database, 'courses');

      const [classesSnap, coursesSnap] = await Promise.all([
        get(classesRef),
        get(coursesRef),
      ]);

      const classData = classesSnap.val() || {};
      const courseData = coursesSnap.val() || {};

      const result = Object.entries(classData).map(([id, cls]) => {
        const course = courseData[cls.courseId] || {};
        return {
          ...cls,
          id,
          courseInfo: course,
        };
      });

      const filtered = result.filter(cls => {
        let matchesDay = true;
        let matchesTime = true;

        if (searchDay && cls.date?.dayOfWeek) {
          matchesDay = cls.date.dayOfWeek === searchDay;
        }

        if (searchTime && cls.startTime?.hour != null) {
          const hour = cls.startTime.hour;
          if (searchTime === 'morning') matchesTime = hour >= 5 && hour < 12;
          if (searchTime === 'afternoon') matchesTime = hour >= 12 && hour < 17;
          if (searchTime === 'evening') matchesTime = hour >= 17 && hour <= 22;
        }

        return matchesDay && matchesTime;
      });

      setClasses(filtered);
      setError(null);
    } catch (err) {
      console.error('Error fetching classes:', err);
      setError('Failed to load classes. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const isClassBooked = classId => {
    return userBookings.some(booking => booking.classId === classId);
  };

  const isInCart = classId => {
    return cartItems.some(item => String(item.id) === String(classId));
  };

  const handleAddToCart = item => {
    if (isClassBooked(item.id)) {
      Alert.alert('Already Booked', 'You have already booked this class');
      return;
    }

    const classForCart = {
      id: item.id,
      title: `Yoga Class ${item.courseId || 'Unknown'}`,
      date: format(
        new Date(
          item.date.year,
          item.date.monthValue - 1,
          item.date.dayOfMonth,
        ),
        'EEEE, MMMM d, yyyy',
      ),
      time: item.startTime
        ? `${item.startTime.hour}:${String(item.startTime.minute).padStart(
            2,
            '0',
          )}`
        : 'TBA',
      instructor: item.teacher || 'TBA',
      room: item.room || 'TBA',
      availableSlots: item.availableSlots,
      additionalComments: item.additionalComments,
      courseId: item.courseId,
    };

    const added = addToCart(classForCart);

    if (added) {
      setTriggerReload(prev => !prev);
      Alert.alert('Added to Cart', 'Class has been added to your cart', [
        {text: 'Continue Shopping', style: 'cancel'},
        {text: 'View Cart', onPress: () => navigation.navigate('CartTab')},
      ]);
    }
  };

  const renderClassItem = ({item}) => {
    const classDate = new Date(
      item.date.year,
      item.date.monthValue - 1,
      item.date.dayOfMonth,
    );
    const formattedDate = format(classDate, 'EEEE, MMMM d, yyyy');
    const dayOfWeek = format(classDate, 'EEEE');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isPast = classDate < today;

    const alreadyBooked = isClassBooked(item.id);
    const inCart = isInCart(item.id);
    const isDisabled =
      alreadyBooked || inCart || item.availableSlots <= 0 || isPast;

    return (
      <View style={styles.classCard}>
        <TouchableOpacity disabled={isDisabled}>
          <View style={styles.classCardHeader}>
            <Text style={styles.className}>
              Yoga Class {item.courseId || 'Unknown'}
            </Text>
            <View
              style={[
                styles.availabilityTag,
                alreadyBooked && styles.bookedTag,
                inCart && styles.inCartTag,
                isPast && styles.fullTag,
              ]}>
              <Text
                style={[
                  styles.availabilityText,
                  alreadyBooked && styles.bookedText,
                  inCart && styles.inCartText,
                  isPast && styles.fullText,
                ]}>
                {alreadyBooked
                  ? 'Booked'
                  : inCart
                  ? 'In Cart'
                  : isPast
                  ? 'Past Class'
                  : `${item.availableSlots || 0} ${
                      item.availableSlots === 1 ? 'spot' : 'spots'
                    } left`}
              </Text>
            </View>
          </View>

          <View style={styles.classDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Date:</Text>
              <Text style={styles.detailText}>{formattedDate}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Teacher:</Text>
              <Text style={styles.detailText}>{item.teacher || 'TBA'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Room:</Text>
              <Text style={styles.detailText}>{item.room || 'TBA'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Type:</Text>
              <View style={styles.typeBadge}>
                <Text style={styles.typeText}>
                  {item.courseInfo?.type || 'General'}
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Duration:</Text>
              <Text style={styles.detailText}>
                {item.courseInfo?.duration || '?'} mins
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Time:</Text>
              <Text style={styles.detailText}>
                {item.startTime
                  ? `${item.startTime.hour}:${String(
                      item.startTime.minute,
                    ).padStart(2, '0')}`
                  : item.courseInfo?.time || 'TBA'}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Price:</Text>
              <Text style={styles.priceText}>
                £
                {item.courseInfo?.price != null
                  ? item.courseInfo.price.toFixed(2)
                  : '0.00'}
              </Text>
            </View>
          </View>

          {item.additionalComments && (
            <View style={styles.commentsSection}>
              <Text style={styles.commentsText}>{item.additionalComments}</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.cardFooter}>
          <Text style={styles.dayIndicator}>{dayOfWeek}</Text>

          {alreadyBooked ? (
            <View style={styles.bookedButton}>
              <Text style={styles.bookedButtonText}>Already Booked</Text>
            </View>
          ) : inCart ? (
            <TouchableOpacity
              style={styles.removeFromCartButton}
              onPress={() => {
                removeFromCart(item.id);
                setTriggerReload(prev => !prev);
              }}>
              <Text style={styles.removeFromCartButtonText}>
                Remove from Cart
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.addToCartButton,
                isDisabled && styles.disabledButton,
              ]}
              onPress={() => handleAddToCart(item)}
              disabled={isDisabled}>
              <Text style={styles.addToCartButtonText}>
                {isPast
                  ? 'Class Ended'
                  : item.availableSlots > 0
                  ? 'Add to Cart'
                  : 'Class Full'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6B8E23" />
        <Text style={styles.loadingText}>Loading classes...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadClasses}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const cartItemCount = getCartCount();

  return (
    <View style={styles.container}>
      {cartItemCount > 0 && (
        <TouchableOpacity
          style={styles.cartSummary}
          onPress={() => navigation.navigate('CartTab')}>
          <Text style={styles.cartSummaryText}>
            {cartItemCount} {cartItemCount === 1 ? 'class' : 'classes'} in cart
          </Text>
          <Text style={styles.viewCartText}>View Cart →</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={classes}
        keyExtractor={item => item.id.toString()}
        renderItem={renderClassItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshing={loading}
        onRefresh={() => {
          setLoading(true);
          loadClasses();
          if (auth.currentUser) {
            fetchUserBookings();
          }
        }}
        extraData={[cartItems]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f8f8f8'},
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  removeFromCartButton: {
    backgroundColor: '#ff5722', // Orange - different from the green "Add to Cart"
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
  },
  removeFromCartButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  cartIndicator: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: '#ff9800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    zIndex: 1,
  },
  cartIndicatorText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  loadingText: {marginTop: 10, fontSize: 16, color: '#6B8E23'},
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
  emptyText: {fontSize: 16, color: '#666', textAlign: 'center'},
  listContainer: {padding: 15},
  classCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  classCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  className: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 10,
  },
  availabilityTag: {
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  bookedTag: {
    backgroundColor: '#e3f2fd',
  },
  fullTag: {
    backgroundColor: '#ffebee',
  },
  availabilityText: {fontSize: 12, color: '#388e3c', fontWeight: 'bold'},
  bookedText: {
    color: '#1976d2',
  },
  fullText: {
    color: '#d32f2f',
  },
  classDetails: {padding: 15},
  detailRow: {flexDirection: 'row', marginBottom: 8},
  detailLabel: {width: 70, fontSize: 14, color: '#666', fontWeight: 'bold'},
  detailText: {flex: 1, fontSize: 14, color: '#333'},
  commentsSection: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  commentsText: {fontSize: 14, color: '#666', fontStyle: 'italic'},
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  dayIndicator: {fontSize: 14, fontWeight: 'bold', color: '#6B8E23'},
  addToCartButton: {
    backgroundColor: '#6B8E23',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
  },
  addToCartButtonText: {color: '#fff', fontWeight: 'bold', fontSize: 12},
  disabledButton: {
    backgroundColor: '#ccc',
  },
  bookedButton: {
    backgroundColor: '#1976d2',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
  },
  bookedButtonText: {color: '#fff', fontWeight: 'bold', fontSize: 12},
  cartSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff3e0',
    padding: 12,
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cartSummaryText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fb8c00',
  },
  viewCartText: {
    fontSize: 14,
    color: '#fb8c00',
    fontWeight: 'bold',
  },
  typeBadge: {
    backgroundColor: '#e0f2f1',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginLeft: 10,
  },
  typeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#00796b',
  },
  priceText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#388e3c',
  },
});

export default ClassListScreen;