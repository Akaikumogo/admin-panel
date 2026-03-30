import { lazy, type JSX } from 'react';
import { type RouteObject } from 'react-router-dom';
import Navigator from './Providers/Navigator';
import NotFoundPage from './pages/NotFounds/NotFoundPage';
import ModuleNotFound from './pages/NotFounds/NotFoundModule';
import DashboardLayout from './Layout/Layout';

import AnimateWrapper from './components/AnimateWrapper';

const LoginPage = lazy(() => import('./pages/Login/Login'));
const HomePage = lazy(() => import('./pages/Home'));
const ProfilePage = lazy(() => import('./pages/Profile/Profile'));
const LevelsPage = lazy(() => import('./pages/Levels/Levels'));
const TheoriesPage = lazy(() => import('./pages/Theories/Theories'));
const QuestionsPage = lazy(() => import('./pages/Questions/Questions'));
const ModeratorsPage = lazy(() => import('./pages/Moderators/Moderators'));
const OrganizationsPage = lazy(() => import('./pages/Organizations/Organizations'));
const UsersPage = lazy(() => import('./pages/Users/Users'));
const StudentsPage = lazy(() => import('./pages/Students/Students'));
const StudentDetailPage = lazy(() => import('./pages/Students/StudentDetail'));

const withSuspense = (
  Component: React.LazyExoticComponent<() => JSX.Element | null>
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
            path: 'levels',
            element: withSuspense(LevelsPage)
          },
          {
            path: 'theories',
            element: withSuspense(TheoriesPage)
          },
          {
            path: 'questions',
            element: withSuspense(QuestionsPage)
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
            path: '*',
            element: <ModuleNotFound />
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
    path: '*',
    element: <NotFoundPage />
  }
];
