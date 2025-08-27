# Run App - React Native Frontend

A comprehensive running and fitness tracking mobile application built with React Native and Expo. The app enables users to create running events, track their runs, connect with friends, and receive AI-powered coaching.

Has a Wear-OS companion app at https://github.com/Tomer-Zur/Run-wearOS
Backend at https://github.com/avivjan/Run

## Features

### 🏃‍♂️ Running & Tracking
- **Free Run Mode**: Track your runs with GPS location, distance, pace, and elevation
- **Guided Run Mode**: Follow predefined tracks with turn-by-turn navigation
- **Event Runs**: Join or create running events with real-time participant tracking
- **Run History**: View detailed statistics and maps of your past runs
- **Real-time Position Tracking**: See other runners' positions during events

### 🎯 Event Management
- **Create Events**: Host running events with custom locations, tracks, and difficulty levels
- **Join Events**: Browse and join upcoming running events
- **Event Status Management**: Mark yourself as ready and manage event participation

### 👥 Social Features
- **Friend System**: Send and accept friend requests
- **User Search**: Find and connect with other runners
- **Friend Activity**: View your friends' running activities
- **Social Profiles**: Share your running achievements and statistics

### 🤖 AI Coaching
- **Personalized Coaching**: AI-powered training recommendations
- **Training Plans**: Generate customized training plans based on your statistics
- **Performance Analytics**: Detailed insights into your running performance

### 🗺️ Maps & Navigation
- **Interactive Maps**: Built-in map interface for route planning and tracking
- **Track Selection**: Choose from predefined running tracks
- **Location Services**: Precise GPS tracking with altitude and speed data
- **Route Visualization**: View your running routes on detailed maps

## Tech Stack

- **React Native** - Cross-platform mobile development framework
- **Expo** - Development platform and build tools
- **React Navigation** - Navigation framework
- **WebView** - Map integration and web content
- **SignalR** - Real-time communication for live updates
- **Expo Location** - GPS tracking and location services
- **AsyncStorage** - Local data persistence
- **Azure Maps** - Load an interactive world map with markers and tracks
- **Azure Maps Weather Service** - Location and time based weather reports
- **Azure Functions API** - Serverless backend for application logic, authentication, and data storage
- **Azure Storage** - Cloud storage for content such as run data, user and event information
- **Azure OpenAI** - AI-powered coaching, training plan generation, and performance analytics

## Project Structure - Frontend

```
run/run/
├── App.js                          # Main application component
├── index.js                        # Entry point
├── app.json                        # Expo configuration
├── package.json                    # Dependencies and scripts
├── babel.config.js                 # Babel configuration
├── runnerMap.html                  # Main map interface (WebView)
├── runSummaryMap.html              # Run summary map interface
├── assets/                         # Static assets (images, icons)
├── utils/
│   └── api.js                      # API functions and authentication
│── LoginScreen.js                  # User authentication
│── RegisterScreen.js               # User registration
│── UserProfileScreen.js            # User profile management
│── UserProfileTabs.js              # Profile tab navigation
│── EventScreen.js                  # Event details and management
│── CreateEventSheet.js             # Event creation interface
│── SelectTrackScreen.js            # Track selection interface
│── RunSummaryScreen.js             # Run completion summary
│── RunHistory.js                   # Historical run data
│── CoachingDashboard.js            # AI coaching interface
│── FloatingCoach.js                # Quick coaching access
│── UserSearchScreen.js             # User discovery
│── FriendsScreen.js                # Friends management
│── FriendsList.js                  # Friends display
│── FriendRequests.js               # Friend request handling
│── FutureEvents.js                 # Upcoming events
│── TrackPreviewModal.js            # Track preview interface
```

## Getting Started

### Prerequisites

Before running this application, ensure you have the following installed:

- **Node.js** (v16 or higher)
- **npm** or **yarn** package manager
- **Expo CLI** (`npm install -g @expo/cli`)
- **Expo Go** app on your mobile device (for testing)
- **Android Studio** (for Android development)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd run
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Configure environment**
   - Ensure you have access to the backend API at `https://runfuncionapp.azurewebsites.net/api`
   - The app uses Azure SignalR for real-time communication

### Running the Application

#### Development Mode
```bash
# Start the development server
npx expo start
```

This will start the Expo development server and provide options to:
- Run on Android emulator/device
- Scan QR code with Expo Go app

### Permissions Required

The app requires the following permissions:
- **Location Services**: For GPS tracking and route mapping
- **Internet Access**: For API communication and real-time updates

### Development Notes

- The app uses WebView for map functionality to leverage web-based mapping libraries
- Real-time features are powered by Azure SignalR for live event updates
- Location tracking uses Expo Location with high-accuracy GPS
- Authentication is handled via JWT tokens stored in AsyncStorage
- The app supports both free runs and guided runs with predefined tracks
