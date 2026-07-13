import { lazy } from 'react';
import { Navigate, useLocation, type RouteObject } from 'react-router-dom';
import Navigator from './Providers/Navigator';
import NotFoundPage from './pages/NotFounds/NotFoundPage';

import DashboardLayout from './Layout/Layout';

import AnimateWrapper from './components/AnimateWrapper';

const LoginPage = lazy(() => import('./pages/Login/Login'));
const OAuthCallbackPage = lazy(() => import('./pages/OAuthCallback/OAuthCallback'));
const HomePage = lazy(() => import('./pages/Home'));
const ProfilePage = lazy(() => import('./pages/Profile/Profile'));
const LevelsPage = lazy(() => import('./pages/Levels/Levels'));
const LessonsPage = lazy(() => import('./pages/Lessons/Lessons'));
const AudioLibraryPage = lazy(() => import('./pages/AudioLibrary/AudioLibrary'));
const TheoriesPage = lazy(() => import('./pages/Theories/Theories'));
const QuestionsPage = lazy(() => import('./pages/Questions/Questions'));
const LevelDetailPage = lazy(() => import('./pages/Levels/LevelDetail'));
const TheoryDetailPage = lazy(() => import('./pages/Theories/TheoryDetail'));
const QuestionDetailPage = lazy(() => import('./pages/Questions/QuestionDetail'));
const ModeratorsPage = lazy(() => import('./pages/Moderators/Moderators'));
const PermissionsPage = lazy(() => import('./pages/Permissions/Permissions'));
const OrganizationsPage = lazy(
  () => import('./pages/Organizations/Organizations')
);
const OrganizationDetailPage = lazy(
  () => import('./pages/Organizations/OrganizationDetail')
);
const StudentsPage = lazy(() => import('./pages/Students/Students'));
const StudentDetailPage = lazy(() => import('./pages/Students/StudentDetail'));
const ViolationsPage = lazy(() => import('./pages/Violations/Violations'));
const LogsPage = lazy(() => import('./pages/Logs/Logs'));
const HeartsAnalyticsPage = lazy(() => import('./pages/HeartsAnalytics/HeartsAnalytics'));
const ReportsPage = lazy(() => import('./pages/Reports/ReportsPage'));
const LeaderboardPage = lazy(() => import('./pages/Leaderboard/Leaderboard'));
const AiAssistantPage = lazy(() => import('./pages/AiAssistant/AiAssistant'));
const NesSyncPage = lazy(() => import('./pages/NesSync/NesSync'));
const UserActivityPage = lazy(() => import('./pages/UserActivity/UserActivity'));
const ImportExportPage = lazy(() => import('./pages/ImportExport/ImportExport'));
const AnalyticsLayout = lazy(() => import('./pages/Analytics'));
const ExecutiveDashboard = lazy(() => import('./pages/Analytics/ExecutiveDashboard'));
const BranchDetail = lazy(() => import('./pages/Analytics/BranchDetail'));
const DepartmentEmployees = lazy(() => import('./pages/Analytics/DepartmentEmployees'));
const UnderperformersPage = lazy(() => import('./pages/Analytics/UnderperformersPage'));

const withSuspense = (
  Component: React.LazyExoticComponent<React.ComponentType>
) => {
  return (
    <AnimateWrapper>
      <Component />
    </AnimateWrapper>
  );
};

function BranchAnalyticsRedirect() {
  const location = useLocation();
  return <Navigate to={`/dashboard/analytics${location.search}`} replace />;
}

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Navigator />,
    children: [
      {
        path: 'dashboard',
        element: <DashboardLayout />,
        children: [
          {
            path: 'home',
            element: withSuspense(HomePage)
          },
          {
            path: 'moderators',
            element: withSuspense(ModeratorsPage)
          },
          {
            path: 'permissions',
            element: withSuspense(PermissionsPage)
          },
          {
            path: 'levels',
            element: withSuspense(LevelsPage)
          },
          {
            path: 'levels/:id',
            element: withSuspense(LevelDetailPage)
          },
          {
            path: 'lessons',
            element: withSuspense(LessonsPage)
          },
          {
            path: 'audio-library',
            element: withSuspense(AudioLibraryPage)
          },
          {
            path: 'theories',
            element: withSuspense(TheoriesPage)
          },
          {
            path: 'theories/:id',
            element: withSuspense(TheoryDetailPage)
          },
          {
            path: 'questions',
            element: withSuspense(QuestionsPage)
          },
          {
            path: 'questions/:id',
            element: withSuspense(QuestionDetailPage)
          },
          {
            path: 'organizations',
            element: withSuspense(OrganizationsPage)
          },
          {
            path: 'organizations/:id',
            element: withSuspense(OrganizationDetailPage)
          },
          {
            path: 'employees',
            element: withSuspense(StudentsPage)
          },
          {
            path: 'employees/:id',
            element: withSuspense(StudentDetailPage)
          },
          {
            path: 'students',
            element: withSuspense(StudentsPage)
          },
          {
            path: 'students/:id',
            element: withSuspense(StudentDetailPage)
          },
          {
            path: 'users',
            element: <Navigate to="/dashboard/employees" replace />
          },
          {
            path: 'profile',
            element: withSuspense(ProfilePage)
          },
          {
            path: 'violations',
            element: withSuspense(ViolationsPage)
          },
          {
            path: 'logs',
            element: withSuspense(LogsPage)
          },
          {
            path: 'hearts-analytics',
            element: withSuspense(HeartsAnalyticsPage)
          },
          {
            path: 'leaderboard',
            element: withSuspense(LeaderboardPage)
          },
          {
            path: 'ai-assistant',
            element: withSuspense(AiAssistantPage)
          },
          {
            path: 'nes-sync',
            element: withSuspense(NesSyncPage)
          },
          {
            path: 'user-activity',
            element: withSuspense(UserActivityPage)
          },
          {
            path: 'reports',
            element: withSuspense(ReportsPage),
          },
          {
            path: 'analytics',
            element: withSuspense(AnalyticsLayout),
            children: [
              { index: true, element: withSuspense(ExecutiveDashboard) },
              { path: 'branches/:orgId', element: withSuspense(BranchDetail) },
              {
                path: 'branches/:orgId/dept/:division',
                element: withSuspense(DepartmentEmployees),
              },
              {
                path: 'branches/:orgId/employees',
                element: withSuspense(DepartmentEmployees),
              },
              { path: 'underperformers', element: withSuspense(UnderperformersPage) },
            ],
          },
          {
            path: 'import-export',
            element: withSuspense(ImportExportPage)
          },
          {
            path: 'branch-analytics',
            element: <BranchAnalyticsRedirect />
          }
        ]
      }
    ]
  },
  {
    path: 'login',
    element: withSuspense(LoginPage)
  },
  {
    path: 'oauth/callback',
    element: withSuspense(OAuthCallbackPage)
  },

  {
    path: '*',
    element: <NotFoundPage />
  }
];
