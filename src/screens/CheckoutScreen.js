import React, {useState, useContext} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
} from 'react-native';
import {CartContext} from '../context/CartContext';

const CheckoutScreen = ({navigation}) => {
  const {cartItems, clearCart, getCartTotal, processCheckout, checkoutLoading} =
    useContext(CartContext);

  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const result = await processCheckout();
      setLoading(false);

      if (result.success) {
        Alert.alert('Booking Confirmed', result.message, [
          {
            text: 'View My Bookings',
            onPress: () => navigation.navigate('BookingsTab'),
          },
          {
            text: 'Book More Classes',
            onPress: () => navigation.navigate('ClassStack'),
          },
        ]);
      } else {
        Alert.alert('Checkout Failed', result.message, [
          {text: 'Back to Cart', onPress: () => navigation.goBack()},
        ]);
      }
    } catch (error) {
      setLoading(false);
      console.error('Checkout execution error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };

  const renderCartItem = ({item}) => {
    return (
      <View style={styles.cartItem}>
        <Text style={styles.className}>{item.title}</Text>
        <Text style={styles.itemDetail}>
          Type: {item.courseInfo?.type || 'N/A'}
        </Text>
        <Text style={styles.itemDetail}>Date: {item.date}</Text>
        <Text style={styles.itemDetail}>
          Time: {item.time || item.courseInfo?.time || 'TBA'}
        </Text>
        <Text style={styles.itemDetail}>Instructor: {item.instructor}</Text>
        <Text style={styles.itemDetail}>Room: {item.room}</Text>
        <Text style={styles.itemDetail}>
          Duration: {item.courseInfo?.duration || '?'} mins
        </Text>
        <Text style={styles.itemDetail}>
          Price: £{item.courseInfo?.price || 0}
        </Text>
      </View>
    );
  };

  if (cartItems.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Your cart is empty</Text>
        <TouchableOpacity
          style={styles.browseButton}
          onPress={() => navigation.navigate('ClassStack')}>
          <Text style={styles.browseButtonText}>Browse Classes</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const total = getCartTotal();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Order Summary</Text>

        <View style={styles.summary}>
          <Text style={styles.summaryText}>
            You're booking {cartItems.length}{' '}
            {cartItems.length === 1 ? 'class' : 'classes'}
          </Text>
          <Text style={styles.summaryTotal}>Total: ${total.toFixed(2)}</Text>
        </View>

        <FlatList
          data={cartItems}
          keyExtractor={item => item.id}
          renderItem={renderCartItem}
          scrollEnabled={false}
          style={styles.list}
        />

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            • Once confirmed, your booking will be visible in "My Bookings"
          </Text>
          <Text style={styles.infoText}>
            • You can cancel bookings up to 24 hours before class time
          </Text>
          <Text style={styles.infoText}>
            • Payment will be collected at the studio
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.confirmButton,
            (loading || checkoutLoading) && styles.disabledButton,
          ]}
          onPress={handleCheckout}
          disabled={loading || checkoutLoading}>
          {loading || checkoutLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.confirmButtonText}>Confirm Booking</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          disabled={loading || checkoutLoading}>
          <Text style={styles.cancelButtonText}>Back to Cart</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    marginBottom: 20,
  },
  browseButton: {
    backgroundColor: '#6B8E23',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  browseButtonText: {
    color: 'white',
    fontSize: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    marginVertical: 10,
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
  summary: {
    marginBottom: 10,
    alignItems: 'center',
  },
  summaryText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  summaryTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 6,
    color: '#6B8E23',
  },
  list: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    marginTop: 10,
  },
  cartItem: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  className: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  itemDetail: {
    fontSize: 14,
    color: '#555',
    marginBottom: 3,
  },
  infoBox: {
    backgroundColor: '#f0f8ff',
    padding: 15,
    borderRadius: 8,
    marginVertical: 20,
  },
  infoText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginBottom: 5,
  },
  confirmButton: {
    backgroundColor: '#6B8E23',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  disabledButton: {
    backgroundColor: '#a0b669',
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

export default CheckoutScreen;
