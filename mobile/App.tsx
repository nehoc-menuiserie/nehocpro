import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CatalogProvider } from './src/catalog';
import { SitesProvider, useSites } from './src/context';
import { AuthProvider, useAuth } from './src/auth';
import { BackofficeScreen } from './src/screens/BackofficeScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { ReportScreen } from './src/screens/ReportScreen';
import { SiteScreen } from './src/screens/SiteScreen';
import { colors } from './src/theme';
import type { RootStackParamList } from './src/types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.bg,
    text: colors.text,
    border: colors.border,
    primary: colors.silver,
  },
};

function RootNav() {
  const { ready } = useSites();
  const { session, ready: authReady } = useAuth();

  if (!authReady || !ready) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.silver} />
      </View>
    );
  }

  if (!session) {
    return <LoginScreen />;
  }

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade_from_bottom', contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Site" component={SiteScreen} />
        <Stack.Screen name="Report" component={ReportScreen} />
        <Stack.Screen name="Backoffice" component={BackofficeScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <CatalogProvider>
          <SitesProvider>
            <StatusBar style="light" />
            <RootNav />
          </SitesProvider>
        </CatalogProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
