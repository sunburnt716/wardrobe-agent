import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TabBar } from '../components/layout/TabBar';
import { AddScreen } from '../screens/AddScreen';
import { AskScreen } from '../screens/AskScreen';
import { ClosetScreen } from '../screens/ClosetScreen';
import { FitsScreen } from '../screens/FitsScreen';
import { TodayScreen } from '../screens/TodayScreen';

export type RootTabParamList = {
  today: { look?: string } | undefined;
  closet: undefined;
  add: undefined;
  ask: undefined;
  fits: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

export function RootNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen name="today" component={TodayScreen} />
      <Tab.Screen name="closet" component={ClosetScreen} />
      <Tab.Screen name="add" component={AddScreen} />
      <Tab.Screen name="ask" component={AskScreen} />
      <Tab.Screen name="fits" component={FitsScreen} />
    </Tab.Navigator>
  );
}
