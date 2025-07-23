import React, { useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { TabView } from 'react-native-tab-view';
import RunHistory from './RunHistory'
import FutureEvents from './FutureEvents';
import FriendsScreen from './FriendsScreen';


export default function userProfileTabs({ navigation, userId }) {
    const layout = useWindowDimensions();
    const [index, setIndex] = useState(0);

    const routes = [
        { key: 'History', title: 'History' },
        { key: 'Future Events', title: 'Future Events' },
        { key: 'Friends', title: 'Friends' },
    ];

    const renderScene = ({ route }) => {
        switch (route.key) {
            case 'History':
                return <RunHistory
                        navigation={navigation}
                        userId={userId}
                        />
            case 'Future Events':
                return <FutureEvents
                        navigation={navigation}
                        />
            case 'Friends':
                return <FriendsScreen
                        navigation={navigation}
                        />
            default: return
        }
    }

    return (
        <TabView
            navigationState={{ index, routes }}
            renderScene={renderScene}
            onIndexChange={setIndex}
            initialLayout={{ width: layout.width }}
        />
    )
}