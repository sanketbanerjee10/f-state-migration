import { useLayoutEffect } from 'react';
import { Route, Switch, useLocation } from 'wouter';
import { LeadershipLogin } from './pages/LeadershipLogin';
import { LeadershipDashboard } from './pages/LeadershipDashboard';
import { LeadershipSettings } from './pages/LeadershipSettings';
import { ApplicationWizard } from './pages/application/ApplicationWizard';
import { SubmittedApplicationPage } from './pages/application/SubmittedApplicationPage';
import { ApplicationTracker } from './pages/ApplicationTracker';
import { About565 } from './pages/About565';
import { GamePage } from './pages/game/GamePage';
import { WelcomePage } from './pages/WelcomePage';
import { NotFound } from './pages/NotFound';
import { ReturningUserModal } from './components/ReturningUserModal';
import { Toaster } from './components/ui/sonner';

function App() {
  const [location] = useLocation();

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  return (
    <>
      <ReturningUserModal />
      <Toaster position="top-right" />
      <Switch>
        {/* About 565 public route */}
        <Route path="/about" component={About565} />
        <Route path="/about-565" component={About565} />

        {/* Isolated 565 Zombie Survival entry point */}
        <Route path="/game" component={GamePage} />

        {/* Public Application Tracker routes */}
        <Route path="/track/:id" component={ApplicationTracker} />
        <Route path="/track" component={ApplicationTracker} />
        <Route path="/status/:id" component={ApplicationTracker} />
        <Route path="/status" component={ApplicationTracker} />
        <Route path="/application-submitted/:id" component={SubmittedApplicationPage} />

        {/* Leadership access routes */}
        <Route path="/leadership" component={LeadershipLogin} />
        <Route path="/leadership/dashboard" component={LeadershipDashboard} />
        <Route path="/leadership/settings" component={LeadershipSettings} />
        <Route path="/leadership/alliances" component={LeadershipSettings} />
        <Route path="/leadership/thresholds" component={LeadershipSettings} />
        <Route path="/admin/access" component={LeadershipLogin} />
        <Route path="/admin/dashboard" component={LeadershipDashboard} />
        <Route path="/admin/settings" component={LeadershipSettings} />
        <Route path="/admin" component={LeadershipLogin} />

        {/* Multi-step Application Wizard routes */}
        <Route path="/" component={WelcomePage} />
        <Route path="/apply" component={ApplicationWizard} />
        <Route path="/apply/:step*" component={ApplicationWizard} />

        {/* 404 fallback */}
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

export default App;
