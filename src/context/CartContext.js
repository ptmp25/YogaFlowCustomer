// Import necessary React and Firebase utilities
import React, {createContext, useState, useEffect} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage'; // For persistent local storage
import {database, auth} from '../firebase/config';
import {ref, get, update} from 'firebase/database';
import {Alert} from 'react-native';

// Create a context to hold and share cart-related state and actions globally
export const CartContext = createContext();

// Context provider component to wrap around children components and supply cart features
export const CartProvider = ({children}) => {
  const [cartItems, setCartItems] = useState([]); // State to store cart items
  const [loading, setLoading] = useState(true); // Loading state to track initial AsyncStorage read
  const [checkoutLoading, setCheckoutLoading] = useState(false); // Loading state for checkout process

  /**
   * Load persisted cart data from AsyncStorage when the component mounts.
   * This ensures cart contents are preserved between app restarts.
   */
  useEffect(() => {
    const loadCart = async () => {
      try {
        const storedCart = await AsyncStorage.getItem('cart');
        if (storedCart !== null) {
          setCartItems(JSON.parse(storedCart));
        }
      } catch (error) {
        console.error('Error loading cart from storage:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCart();
  }, []);

  /**
   * Persist the current cart to AsyncStorage whenever it changes.
   * Skip the first render to avoid saving before load is complete.
   */
  useEffect(() => {
    const saveCart = async () => {
      try {
        await AsyncStorage.setItem('cart', JSON.stringify(cartItems));
      } catch (error) {
        console.error('Error saving cart to storage:', error);
      }
    };

    if (!loading) {
      saveCart();
    }
  }, [cartItems, loading]);

  /**
   * Add a class to the cart.
   * Prevents duplicates and enriches the class data with course information.
   */
  const addToCart = async item => {
    // Prevent duplicate entries in the cart
    const exists = cartItems.some(i => String(i.id) === String(item.id));
    if (exists) return false;

    try {
      // Retrieve detailed course info from Firebase for display/enrichment
      const courseRef = ref(database, `courses/${item.courseId}`);
      const courseSnap = await get(courseRef);
      const courseInfo = courseSnap.exists() ? courseSnap.val() : {};
      console.log('Course info:', courseInfo);
      // Format class start time
      let formattedTime = 'TBA';

      if (item.time && item.time !== 'TBA' && item.time.trim() !== '') {
        formattedTime = item.time;
      } else if (item.startTime && typeof item.startTime.hour === 'number') {
        formattedTime = `${item.startTime.hour}:${String(
          item.startTime.minute || 0,
        ).padStart(2, '0')}`;
      } else if (courseInfo.time && courseInfo.time.trim() !== '') {
        formattedTime = courseInfo.time;
      }
      console.log('Formatted time:', formattedTime);
      // Construct a full object with class and course information
      const classForCart = {
        id: item.id,
        title: courseInfo.name || 'Class',
        date:
          typeof item.date === 'object'
            ? `${String(item.date.dayOfMonth).padStart(2, '0')}/${String(
                item.date.monthValue,
              ).padStart(2, '0')}/${item.date.year}`
            : item.date,
        time: formattedTime,
        instructor: item.teacher || item.instructor || 'TBA',
        room: item.room || 'TBA',
        availableSlots: item.availableSlots,
        courseId: item.courseId,
        courseInfo: {
          name: courseInfo.name || '',
          price: courseInfo.price || 0,
          type: courseInfo.type || '',
          description: courseInfo.description || '',
          duration: courseInfo.duration || '',
          time: courseInfo.time || '',
        },
      };

      console.log('🧺 Adding to cart:', classForCart);
      setCartItems(prev => [...prev, classForCart]);
      return true;
    } catch (err) {
      console.error('❌ Failed to enrich cart item:', err);
      return false;
    }
  };

  /**
   * Remove a class from the cart using its unique ID
   */
  const removeFromCart = classId => {
    setCartItems(prev =>
      prev.filter(item => String(item.id) !== String(classId)),
    );
  };

  /**
   * Calculate the total price of all items currently in the cart
   */
  const getCartTotal = () => {
    return cartItems.reduce(
      (total, item) => total + (item.courseInfo?.price || 0),
      0,
    );
  };

  /**
   * Clear all items from the cart
   */
  const clearCart = () => {
    setCartItems([]);
  };

  /**
   * Get the total number of items currently in the cart
   */
  const getCartCount = () => {
    return cartItems.length;
  };

  /**
   * Validate cart items to ensure they can be booked
   * Returns object with success flag and optional error message
   */
  const validateCart = async () => {
    if (!auth.currentUser) {
      return {
        success: false,
        message: 'You must be logged in to complete your booking',
      };
    }

    if (cartItems.length === 0) {
      return {
        success: false,
        message: 'Your cart is empty. Add classes to book.',
      };
    }

    let hasError = false;
    let errorMessage = '';

    for (const item of cartItems) {
      const classRef = ref(database, `classes/${item.id}`);
      const snapshot = await get(classRef);
      const currentClassData = snapshot.val();

      if (!currentClassData) {
        hasError = true;
        errorMessage += `\n- ${item.title} does not exist anymore.`;
        continue;
      }

      // Check if class is full
      if (currentClassData.availableSlots <= 0) {
        hasError = true;
        errorMessage += `\n- ${item.title} is fully booked.`;
        continue;
      }

      // Check if class is in the past
      const classDate = new Date(
        currentClassData.date.year,
        currentClassData.date.monthValue - 1,
        currentClassData.date.dayOfMonth,
      );
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (classDate < today) {
        hasError = true;
        errorMessage += `\n- ${item.title} is in the past.`;
        continue;
      }

      // Check if already booked
      const allBookingsRef = ref(database, 'bookings');
      const allBookingsSnap = await get(allBookingsRef);
      const allBookings = allBookingsSnap.val();

      const alreadyBooked = Object.values(allBookings || {}).some(
        booking =>
          booking.userId === auth.currentUser.uid &&
          booking.classId === item.id,
      );

      if (alreadyBooked) {
        hasError = true;
        errorMessage += `\n- You've already booked ${item.title}.`;
      }
    }

    if (hasError) {
      return {
        success: false,
        message: `The following issues were found:\n${errorMessage}`,
      };
    }

    return {success: true};
  };

  /**
   * Process checkout and create bookings
   * Returns object with success flag and optional message/bookingIds
   */
  const processCheckout = async navigation => {
    setCheckoutLoading(true);
    try {
      // First validate cart items
      const validation = await validateCart();
      if (!validation.success) {
        return {success: false, message: validation.message};
      }

      const updates = {};
      const bookingIds = [];

      // Process each booking
      for (const item of cartItems) {
        const classRef = ref(database, `classes/${item.id}`);
        const snapshot = await get(classRef);
        const currentClassData = snapshot.val();

        const bookingId = `${item.id}_${auth.currentUser.uid}_${Date.now()}`;
        bookingIds.push(bookingId);

        // Create booking data with consistent structure
        const bookingData = {
          id: bookingId,
          classId: item.id,
          userId: auth.currentUser.uid,
          bookingDate: new Date().toISOString(),
          className: item.title,
          classDate: currentClassData.date,
          bookingTime: new Date().toISOString(),
          startTime:
            currentClassData.startTime || item.time || currentClassData.time,
          courseInfo: item.courseInfo || {},
          room: currentClassData.room || item.room || '',
          teacher: currentClassData.teacher || item.instructor || '',
          status: 'confirmed',
        };

        updates[`classes/${item.id}/availableSlots`] =
          currentClassData.availableSlots - 1;
        updates[`bookings/${bookingId}`] = bookingData;
      }

      // Update database with all changes
      await update(ref(database), updates);
      clearCart();

      return {
        success: true,
        message: `Successfully booked ${cartItems.length} ${
          cartItems.length === 1 ? 'class' : 'classes'
        }!`,
        bookingIds,
      };
    } catch (error) {
      console.error('Checkout error:', error);
      return {
        success: false,
        message: 'Failed to complete booking. Please try again.',
      };
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Return the context provider with all cart-related data and functions
  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        clearCart,
        getCartCount,
        getCartTotal,
        loading,
        checkoutLoading,
        validateCart,
        processCheckout,
      }}>
      {children}
    </CartContext.Provider>
  );
};
