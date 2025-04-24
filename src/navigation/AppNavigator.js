import React, {useContext} from 'react';
import {View, Image, Text, StyleSheet} from 'react-native';
import {createStackNavigator} from '@react-navigation/stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ClassListScreen from '../screens/ClassListScreen';
import ClassDetailScreen from '../screens/ClassDetailScreen';
import BookingHistoryScreen from '../screens/BookingScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CourseListScreen from '../screens/CourseListScreen';
import CourseClassesScreen from '../screens/CourseClassScreen';
import CartScreen from '../screens/CartScreen';
import CheckoutScreen from '../screens/CheckoutScreen';

import {AuthContext} from '../context/AuthContext';
import {CartContext} from '../context/CartContext';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Stack Navigators remain unchanged
function ClassStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Courses" component={CourseListScreen} />
      <Stack.Screen name="CourseClasses" component={CourseClassesScreen} />
      <Stack.Screen
        name="ClassDetail"
        component={ClassDetailScreen}
        options={({route}) => ({
          title: route.params?.classTitle || 'Class Detail',
        })}
      />
      <Stack.Screen name="SearchResult" component={ClassListScreen} />
    </Stack.Navigator>
  );
}

function BookingsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Bookings" component={BookingHistoryScreen} />
      <Stack.Screen
        name="ClassDetail"
        component={ClassDetailScreen}
        options={({route}) => ({
          title: route.params?.classTitle || 'Class Detail',
        })}
      />
    </Stack.Navigator>
  );
}

function CartStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Cart" component={CartScreen} />
      <Stack.Screen
        name="ClassDetail"
        component={ClassDetailScreen}
        options={({route}) => ({
          title: route.params?.classTitle || 'Class Detail',
        })}
      />
      <Stack.Screen
        name="Checkout"
        component={CheckoutScreen}
        options={{title: 'Checkout'}}
      />
    </Stack.Navigator>
  );
}

function MainTabs() {
  const {getCartCount} = useContext(CartContext);

  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        tabBarIcon: ({focused, color, size}) => {
          // Determine the icon for each tab
          let imageSource;

          switch (route.name) {
            case 'ClassStack':
              imageSource = focused
                ? require('../assets/images/tabs/list_active.png')
                : require('../assets/images/tabs/list.png');
              break;
            case 'BookingsTab':
              imageSource = focused
                ? require('../assets/images/tabs/calendar_active.png')
                : require('../assets/images/tabs/calendar_active.png');
              break;
            case 'CartTab':
              imageSource = focused
                ? require('../assets/images/tabs/cart.png')
                : require('../assets/images/tabs/cart.png');
              break;
            case 'Profile':
              imageSource = focused
                ? require('../assets/images/tabs/person_active.png')
                : require('../assets/images/tabs/person.png');
              break;
            default:
              imageSource = require('../assets/images/tabs/default-icon.png');
          }

          // Custom tab button with pill background
          return (
            <View style={styles.tabIconContainer}>
              <View
                style={[
                  styles.iconPill,
                  focused ? styles.activeIconPill : styles.inactiveIconPill,
                ]}>
                <Image
                  source={imageSource}
                  style={[
                    styles.tabIcon,
                    focused ? styles.activeIcon : styles.inactiveIcon,
                  ]}
                  resizeMode="contain"
                />
              </View>
            </View>
          );
        },
        tabBarLabel: ({focused, color}) => {
          return (
            <Text
              style={[
                styles.tabLabel,
                focused ? styles.activeTabLabel : styles.inactiveTabLabel,
              ]}>
              {route.name === 'ClassStack'
                ? 'Classes'
                : route.name === 'BookingsTab'
                ? 'Bookings'
                : route.name === 'CartTab'
                ? 'Cart'
                : 'Profile'}
            </Text>
          );
        },
        tabBarBadge: route.name === 'CartTab' ? getCartCount() || null : null,
        tabBarBadgeStyle: styles.tabBadge,
        tabBarActiveTintColor: '#6B8E23',
        tabBarInactiveTintColor: '#9FA0BC',
        tabBarStyle: styles.tabBar,
        headerShown: false,
      })}>
      <Tab.Screen name="ClassStack" component={ClassStack} />
      <Tab.Screen name="BookingsTab" component={BookingsStack} />
      <Tab.Screen name="CartTab" component={CartStack} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#F5F6FA',
    borderTopWidth: 0,
    elevation: 0,
    height: 60, // Reduced height from 80 to 60
    borderRadius: 20,
    marginHorizontal: 10,
    marginBottom: 10,
    // Removed position: 'absolute' to prevent overlap with content
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 5, // Reduced padding
  },
  iconPill: {
    width: 50, // Adjusted width
    height: 30, // Adjusted height
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeIconPill: {
    backgroundColor: '#D8E4BC', // Light green background for active pill
  },
  inactiveIconPill: {
    backgroundColor: '#EAEBF4', // Keeping light gray for inactive
  },
  tabIcon: {
    width: 20,
    height: 20,
  },
  activeIcon: {
    tintColor: '#6B8E23', // Dark olive green for active icon
  },
  inactiveIcon: {
    tintColor: '#9FA0BC', // Keeping light gray for inactive icon
  },
  tabLabel: {
    fontSize: 12,
    marginTop: 2,
    marginBottom: 2, // Reduced margin
  },
  activeTabLabel: {
    color: '#6B8E23', // Dark olive green for active label
    fontWeight: '500',
  },
  inactiveTabLabel: {
    color: '#9FA0BC', // Keeping light gray for inactive label
  },
  tabBadge: {
    backgroundColor: '#FF6B6B',
  },
});

export default function AppNavigator() {
  const {user, loading} = useContext(AuthContext);

  if (loading) return null;

  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      {user ? (
        <Stack.Screen name="Main" component={MainTabs} />
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
