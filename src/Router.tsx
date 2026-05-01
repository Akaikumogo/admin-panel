import { lazy } from 'react';
import { type RouteObject } from 'react-router-dom';
import Navigator from './Providers/Navigator';
import NotFoundPage from './pages/NotFounds/NotFoundPage';

import DashboardLayout from './Layout/Layout';

import AnimateWrapper from './components/AnimateWrapper';
import ElektroLearn from './components/qwerttyu';

const LoginPage = lazy(() => import('./pages/Login/Login'));
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
const UsersPage = lazy(() => import('./pages/Users/Users'));
const StudentsPage = lazy(() => import('./pages/Students/Students'));
const StudentDetailPage = lazy(() => import('./pages/Students/StudentDetail'));
const ViolationsPage = lazy(() => import('./pages/Violations/Violations'));
const LogsPage = lazy(() => import('./pages/Logs/Logs'));
const HeartsAnalyticsPage = lazy(() => import('./pages/HeartsAnalytics/HeartsAnalytics'));
const LeaderboardPage = lazy(() => import('./pages/Leaderboard/Leaderboard'));
const AiAssistantPage = lazy(() => import('./pages/AiAssistant/AiAssistant'));

const withSuspense = (
  Component: React.LazyExoticComponent<React.ComponentType>
) => {
  return (
    <AnimateWrapper>
      <Component />
    </AnimateWrapper>
  );
};
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
            path: 'students',
            element: withSuspense(StudentsPage)
          },
          {
            path: 'students/:id',
            element: withSuspense(StudentDetailPage)
          },
          {
            path: 'users',
            element: withSuspense(UsersPage)
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
          }
        ]
      }
    ]
  },
  {
    path: 'login',
    element: withSuspense(LoginPage)
  },
  { path: 'qwerttyu', element: <ElektroLearn /> },

  {
    path: '*',
    element: <NotFoundPage />
  }
];
