import React, { useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { TabView } from 'react-native-tab-view';
import RunHistory from './RunHistory'
import FutureEvents from './FutureEvents';
import FriendsScreen from './FriendsScreen';
import CoachingDashboard from './CoachingDashboard';


export default function userProfileTabs({ navigation, userId, profileId }) {
    const layout = useWindowDimensions();
    const [index, setIndex] = useState(0);

    const routes = [
        { key: 'History', title: 'History' },
        { key: 'Future Events', title: 'Future Events' },
        { key: 'Friends', title: 'Friends' },
        { key: 'Coach', title: 'Coach' },
    ];

    const renderScene = ({ route }) => {
        switch (route.key) {
            case 'History':
                return <RunHistory
                        navigation={navigation}
                        userId={userId}
                        profileId={profileId}
                        />
            case 'Future Events':
                return <FutureEvents
                        navigation={navigation}
                        profileId={profileId}
                        />
            case 'Friends':
                return <FriendsScreen
                        navigation={navigation}
                        userId={userId}
                        profileId={profileId}
                        />
            case 'Coach':
                return <CoachingDashboard
                        navigation={navigation}
                        userId={userId}
                        profileId={profileId}
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