import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import {ref, get} from 'firebase/database';
import {database} from '../firebase/config';
import {Picker} from '@react-native-picker/picker';
import {useFocusEffect} from '@react-navigation/native';

const CourseListScreen = ({navigation}) => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Search filters
  const [showSearch, setShowSearch] = useState(false);
  const [searchDay, setSearchDay] = useState('');
  const [searchTime, setSearchTime] = useState('');

  const fetchCourses = async (isRefreshing = false) => {
    try {
      if (!isRefreshing) {
        setLoading(true);
      }
      const coursesRef = ref(database, 'courses');
      const snapshot = await get(coursesRef);

      if (snapshot.exists()) {
        const coursesData = [];
        snapshot.forEach(childSnapshot => {
          coursesData.push({
            id: childSnapshot.key,
            ...childSnapshot.val(),
          });
        });
        setCourses(coursesData);
        // if (isRefreshing) {
        //   // Show feedback to user when refreshed successfully
        //   Alert.alert('Success', 'Courses updated successfully');
        // }
      } else {
        setCourses([]);
      }
      setError(null);
    } catch (err) {
      console.error('Error fetching courses:', err);
      setError('Failed to load courses. Please try again.');
    } finally {
      setLoading(false);
      if (isRefreshing) {
        setRefreshing(false);
      }
    }
  };

  // Initial load
  useEffect(() => {
    fetchCourses();
  }, []);

  // Reload when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchCourses();
    }, []),
  );

  // Handle pull-to-refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchCourses(true);
  };

  // Handle manual reload button
  const handleReload = () => {
    fetchCourses(true);
  };

  const renderCourseItem = ({item}) => (
    <TouchableOpacity
      style={styles.courseCard}
      onPress={() =>
        navigation.navigate('CourseClasses', {
          courseId: item.id,
          courseName: item.name,
        })
      }>
      <View style={styles.courseHeader}>
        <Text style={styles.courseName}>{item.name || 'Unnamed Course'}</Text>
        <View style={styles.typeTag}>
          <Text style={styles.typeText}>{item.type || 'General'}</Text>
        </View>
      </View>

      <View style={styles.courseDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Schedule:</Text>
          <Text style={styles.detailText}>
            {item.daysOfWeek ? item.daysOfWeek.join(', ') : 'Flexible'}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Duration:</Text>
          <Text style={styles.detailText}>{item.duration || '60'} minutes</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Price:</Text>
          <Text style={styles.detailText}>
            £{item.price ? item.price.toFixed(2) : '0.00'}
          </Text>
        </View>
      </View>

      {item.description && (
        <View style={styles.descriptionSection}>
          <Text numberOfLines={2} style={styles.descriptionText}>
            {item.description}
          </Text>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.viewClassesText}>View Classes →</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6B8E23" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => fetchCourses()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Yoga Courses</Text>
        <TouchableOpacity style={styles.reloadButton} onPress={handleReload}>
          <Text style={styles.reloadButtonText}>Reload</Text>
        </TouchableOpacity>
      </View>

      {/* Toggle Search Button */}
      <TouchableOpacity
        onPress={() => setShowSearch(prev => !prev)}
        style={styles.searchToggle}>
        <Text style={styles.searchToggleText}>
          {showSearch ? 'Hide Search' : 'Search for Classes'}
        </Text>
      </TouchableOpacity>

      {/* Search Filter UI */}
      {showSearch && (
        <View style={styles.searchContainer}>
          <Text style={styles.filterLabel}>Filter by Day:</Text>
          <Picker
            selectedValue={searchDay}
            onValueChange={value => setSearchDay(value)}>
            <Picker.Item label="Any" value="" />
            <Picker.Item label="Monday" value="MONDAY" />
            <Picker.Item label="Tuesday" value="TUESDAY" />
            <Picker.Item label="Wednesday" value="WEDNESDAY" />
            <Picker.Item label="Thursday" value="THURSDAY" />
            <Picker.Item label="Friday" value="FRIDAY" />
            <Picker.Item label="Saturday" value="SATURDAY" />
            <Picker.Item label="Sunday" value="SUNDAY" />
          </Picker>

          <Text style={styles.filterLabel}>Filter by Time of Day:</Text>
          <Picker
            selectedValue={searchTime}
            onValueChange={value => setSearchTime(value)}>
            <Picker.Item label="Any" value="" />
            <Picker.Item label="Morning (5am-11am)" value="morning" />
            <Picker.Item label="Afternoon (12pm-4pm)" value="afternoon" />
            <Picker.Item label="Evening (5pm-10pm)" value="evening" />
          </Picker>

          <TouchableOpacity
            style={styles.searchButton}
            onPress={() =>
              navigation.navigate('SearchResult', {
                searchDay,
                searchTime,
              })
            }>
            <Text style={styles.searchButtonText}>Search Classes</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Course List */}
      {courses.length === 0 ? (
        <View style={styles.emptyCourses}>
          <Text style={styles.emptyText}>
            No courses available at the moment.
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, {marginTop: 15}]}
            onPress={handleReload}>
            <Text style={styles.retryButtonText}>Reload</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={courses}
          keyExtractor={item => item.id.toString()}
          renderItem={renderCourseItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  reloadButton: {
    backgroundColor: '#6B8E23',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
    elevation: 2,
  },
  reloadButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  listContainer: {
    padding: 15,
    paddingTop: 5,
  },
  courseCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 15,
    elevation: 2,
  },
  courseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  courseName: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  typeTag: {
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  typeText: {
    fontSize: 12,
    color: '#5c8aff',
    fontWeight: 'bold',
  },
  courseDetails: {
    padding: 15,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailLabel: {
    width: 75,
    fontSize: 14,
    color: '#666',
    fontWeight: 'bold',
  },
  detailText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  descriptionSection: {
    paddingHorizontal: 15,
    paddingBottom: 15,
  },
  descriptionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  footer: {
    backgroundColor: '#f9f9f9',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    padding: 15,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    alignItems: 'flex-end',
  },
  viewClassesText: {
    color: '#6B8E23',
    fontWeight: 'bold',
  },
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
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  emptyCourses: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  searchToggle: {
    backgroundColor: '#6B8E23',
    padding: 10,
    borderRadius: 8,
    marginHorizontal: 15,
    marginBottom: 10,
    alignItems: 'center',
  },
  searchToggleText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  searchContainer: {
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  filterLabel: {
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
  },
  searchButton: {
    backgroundColor: '#6B8E23',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default CourseListScreen;
