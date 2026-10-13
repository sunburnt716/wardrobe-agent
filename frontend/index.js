// gesture-handler must be imported before anything else touches the view
// tree (its own documented requirement).
import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';

// UX PROPOSAL is active. To revert to the shipped app, swap these two lines:
//   import App from './App';
import App from './App.proposal';

registerRootComponent(App);
