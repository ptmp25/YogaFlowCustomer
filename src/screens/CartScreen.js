import React, {useContext} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {CartContext} from '../context/CartContext';
import {useNavigation} from '@react-navigation/native';

const CartScreen = () => {
  const navigation = useNavigation();
  const {
    cartItems,
    removeFromCart,
    clearCart,
    getCartTotal,
    validateCart,
    checkoutLoading,
  } = useContext(CartContext);

  const handleClearCart = () => {
    Alert.alert('Clear Cart', 'Are you sure you want to clear the cart?', [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Clear', style: 'destructive', onPress: clearCart},
    ]);
  };

  const handleProceedToCheckout = async () => {
    if (cartItems.length === 0) {
      Alert.alert('Empty Cart', 'Your cart is empty. Add classes to book.');
      return;
    }

    // Validate cart before proceeding to checkout
    const validation = await validateCart();
    if (!validation.success) {
      Alert.alert('Cart Issues', validation.message);
      return;
    }

    // All items are valid, proceed to checkout screen
    navigation.navigate('Checkout');
  };

  const renderItem = ({item}) => (
    <View style={styles.card}>
      <Text style={styles.title}>
        {item.title || item.courseInfo?.name || 'Course'}
      </Text>
      <Text style={styles.label}>Type: {item.courseInfo?.type || 'N/A'}</Text>
      <Text style={styles.label}>Instructor: {item.instructor}</Text>
      <Text style={styles.label}>Date: {item.date}</Text>
      <Text style={styles.label}>Time: {item.time}</Text>
      <Text style={styles.label}>Room: {item.room}</Text>
      <Text style={styles.label}>
        Duration: {item.courseInfo?.duration || '?'} mins
      </Text>
      <Text style={styles.label}>Price: £{item.courseInfo?.price || 0}</Text>

      <TouchableOpacity
        style={styles.removeBtn}
        onPress={() => removeFromCart(item.id)}>
        <Text style={styles.removeBtnText}>Remove</Text>
      </TouchableOpacity>
    </View>
  );

  const total = getCartTotal();

  return (
    <View style={styles.container}>
      {cartItems.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Your cart is empty</Text>
          <TouchableOpacity
            style={styles.browseBtn}
            onPress={() => navigation.navigate('ClassStack')}>
            <Text style={styles.browseBtnText}>Browse Classes</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={cartItems}
            keyExtractor={item => item.id.toString()}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            ListHeaderComponent={
              <View style={styles.header}>
                <Text style={styles.headerText}>
                  Your Cart ({cartItems.length}{' '}
                  {cartItems.length === 1 ? 'item' : 'items'})
                </Text>
              </View>
            }
          />

          <View style={styles.footer}>
            <Text style={styles.totalText}>Total: ${total.toFixed(2)}</Text>

            <View style={styles.footerButtons}>
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={handleClearCart}
                disabled={checkoutLoading}>
                <Text style={styles.clearBtnText}>Clear Cart</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.checkoutBtn,
                  checkoutLoading && styles.disabledBtn,
                ]}
                onPress={handleProceedToCheckout}
                disabled={checkoutLoading}>
                {checkoutLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.checkoutBtnText}>
                    Proceed to Checkout
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  list: {
    padding: 15,
    paddingBottom: 80, // Extra padding at bottom for footer
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#777',
    marginBottom: 20,
  },
  browseBtn: {
    backgroundColor: '#6B8E23',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  browseBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  header: {
    marginBottom: 15,
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  label: {
    fontSize: 14,
    color: '#555',
    marginBottom: 3,
  },
  removeBtn: {
    backgroundColor: '#ff5722',
    padding: 8,
    borderRadius: 5,
    marginTop: 10,
    alignItems: 'center',
    alignSelf: 'flex-end',
    width: 100,
  },
  removeBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    backgroundColor: '#fff',
  },
  totalText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  footerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  clearBtn: {
    backgroundColor: '#aaa',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
    width: '30%',
    alignItems: 'center',
  },
  clearBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  checkoutBtn: {
    backgroundColor: '#6B8E23',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
    width: '65%',
    alignItems: 'center',
  },
  checkoutBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  disabledBtn: {
    backgroundColor: '#a0b669',
  },
});

export default CartScreen;
