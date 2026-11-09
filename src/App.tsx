import { lazy, Suspense, useLayoutEffect } from 'react';
import { Route, Switch, useLocation } from 'wouter';
import { Spinner } from './components/ui/spinner';
import { ReturningUserModal } from './components/ReturningUserModal';
import { Toaster } from './components/ui/sonner';

const LeadershipLogin = lazy(() =>
  import('./pages/LeadershipLogin').then((module) => ({ default: module.LeadershipLogin })),
);
const LeadershipDashboard = lazy(() =>
  import('./pages/LeadershipDashboard').then((module) => ({ default: module.LeadershipDashboard })),
);
const LeadershipSettings = lazy(() =>
  import('./pages/LeadershipSettings').then((module) => ({ default: module.LeadershipSettings })),
);
const ApplicationWizard = lazy(() =>
  import('./pages/application/ApplicationWizard').then((module) => ({ default: module.ApplicationWizard })),
);
const SubmittedApplicationPage = lazy(() =>
  import('./pages/application/SubmittedApplicationPage').then((module) => ({ default: module.SubmittedApplicationPage })),
);
const ApplicationTracker = lazy(() =>
  import('./pages/ApplicationTracker').then((module) => ({ default: module.ApplicationTracker })),
);
const About565 = lazy(() =>
  import('./pages/About565').then((module) => ({ default: module.About565 })),
);
const GamePage = lazy(() =>
  import('./pages/game/GamePage').then((module) => ({ default: module.GamePage })),
);
const WelcomePage = lazy(() =>
  import('./pages/WelcomePage').then((module) => ({ default: module.WelcomePage })),
);
const NotFound = lazy(() =>
  import('./pages/NotFound').then((module) => ({ default: module.NotFound })),
);

function App() {
  const [location] = useLocation();

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  return (
    <>
      {(location === '/apply' || location.startsWith('/apply/')) && <ReturningUserModal />}
      <Toaster position="top-right" />
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center">
            <Spinner className="size-8" />
          </div>
        }
      >
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
      </Suspense>
    </>
  );
}

export default App;
