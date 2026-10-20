import { Link, Route, Switch } from 'wouter';
import { LeadershipLogin } from './pages/LeadershipLogin';
import { LeadershipDashboard } from './pages/LeadershipDashboard';
import { LeadershipSettings } from './pages/LeadershipSettings';
import { ApplicationWizard } from './pages/application/ApplicationWizard';
import { ApplicationTracker } from './pages/ApplicationTracker';
import { ReturningUserModal } from './components/ReturningUserModal';

function App() {
  return (
    <>
      <ReturningUserModal />
      <Switch>
        {/* Public Application Tracker routes */}
        <Route path="/track/:id" component={ApplicationTracker} />
        <Route path="/track" component={ApplicationTracker} />
        <Route path="/status/:id" component={ApplicationTracker} />
        <Route path="/status" component={ApplicationTracker} />

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
        <Route path="/" component={ApplicationWizard} />
        <Route path="/apply/:step*" component={ApplicationWizard} />

        {/* 404 fallback */}
        <Route>
          <main className="form-shell">
            <h1 className="form-title">Page not found</h1>
            <p className="intro">This State 565 portal page does not exist.</p>
            <Link className="button" href="/">
              Return to application
            </Link>
          </main>
        </Route>
      </Switch>
    </>
  );
}

export default App;
