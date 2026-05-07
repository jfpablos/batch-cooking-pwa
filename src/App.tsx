import { Layout } from './components/Layout/Layout';
import { MenuGeneratorScreen } from './components/MenuGenerator/MenuGeneratorScreen';
import { MenuDisplayScreen } from './components/MenuDisplay/MenuDisplayScreen';
import { ShoppingListScreen } from './components/ShoppingList/ShoppingListScreen';
import { BatchGuideScreen } from './components/BatchCookingGuide/BatchGuideScreen';
import { VideosScreen } from './components/Videos/VideosScreen';
import { HistoryScreen } from './components/History/HistoryScreen';
import { useAppStore } from './store/useAppStore';

const SCREENS = [
  MenuGeneratorScreen,
  MenuDisplayScreen,
  ShoppingListScreen,
  BatchGuideScreen,
  VideosScreen,
  HistoryScreen,
];

export default function App() {
  const { activeTab } = useAppStore();
  const ActiveScreen = SCREENS[activeTab] ?? MenuGeneratorScreen;

  return (
    <Layout>
      <ActiveScreen />
    </Layout>
  );
}
