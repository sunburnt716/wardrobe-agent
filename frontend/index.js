// gesture-handler must be imported before anything else touches the view
// tree (its own documented requirement).
import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
