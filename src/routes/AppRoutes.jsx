import { Suspense, lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from '../layouts/AppLayout'
import AdminRoute from './AdminRoute'
import PrivateRoute from './PrivateRoute'
import Loading from '../components/common/Loading'
import WelcomePage from '../pages/Auth/WelcomePage'
import LoginPage from '../pages/Auth/LoginPage'
const DashboardPage = lazy(() => import('../pages/Dashboard/DashboardPage'))
const MapPage = lazy(() => import('../pages/Map/MapPage'))
const MembersPage = lazy(() => import('../pages/Members/MembersPage'))
const MemberFormPage = lazy(() => import('../pages/Members/MemberFormPage'))
const PollsPage = lazy(() => import('../pages/Polls/PollsPage'))
const PollFormPage = lazy(() => import('../pages/Polls/PollFormPage'))
const DiaryPage = lazy(() => import('../pages/Diary/DiaryPage'))
const NewDiaryEntryPage = lazy(() => import('../pages/Diary/NewDiaryEntryPage'))
const ItineraryPage = lazy(() => import('../pages/Itinerary/ItineraryPage'))
const ItineraryFormPage = lazy(() => import('../pages/Itinerary/ItineraryFormPage'))
const TipsPage = lazy(() => import('../pages/Tips/TipsPage'))
const TipFormPage = lazy(() => import('../pages/Tips/TipFormPage'))
const HotelsPage = lazy(() => import('../pages/Hotels/HotelsPage'))
const HotelFormPage = lazy(() => import('../pages/Hotels/HotelFormPage'))
const VehiclesPage = lazy(() => import('../pages/Vehicles/VehiclesPage'))
const VehicleFormPage = lazy(() => import('../pages/Vehicles/VehicleFormPage'))
const ExpensesPage = lazy(() => import('../pages/Expenses/ExpensesPage'))
const ExpenseImportPage = lazy(() => import('../pages/Expenses/ExpenseImportPage'))
const ExpenseFormPage = lazy(() => import('../pages/Expenses/ExpenseFormPage'))
const AdminPanelPage = lazy(() => import('../pages/Admin/AdminPanelPage'))
const AgendaPage = lazy(() => import('../pages/Agenda/AgendaPage'))
const AgendaFormPage = lazy(() => import('../pages/Agenda/AgendaFormPage'))
const AlarmsPage = lazy(() => import('../pages/Agenda/AlarmsPage'))
const AlarmFormPage = lazy(() => import('../pages/Agenda/AlarmFormPage'))
const NotificationsPage = lazy(() => import('../pages/Notifications/NotificationsPage'))
const SettingsPage = lazy(() => import('../pages/Settings/SettingsPage'))
const ReviewsPage = lazy(() => import('../pages/Reviews/ReviewsPage'))
const EmergencyPage = lazy(() => import('../pages/Emergency/EmergencyPage'))
const EmergencyFormPage = lazy(() => import('../pages/Emergency/EmergencyFormPage'))

function renderPage(Component) {
  return (
    <Suspense fallback={<Loading />}>
      <Component />
    </Suspense>
  )
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/login" element={<LoginPage />} />

        <Route element={<PrivateRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={renderPage(DashboardPage)} />
            <Route path="/map" element={renderPage(MapPage)} />
            <Route path="/members" element={renderPage(MembersPage)} />
            <Route path="/polls" element={renderPage(PollsPage)} />
            <Route path="/polls/new" element={renderPage(PollFormPage)} />
            <Route path="/diary" element={renderPage(DiaryPage)} />
            <Route path="/diary/new" element={renderPage(NewDiaryEntryPage)} />
            <Route path="/diary/:entryId/edit" element={renderPage(NewDiaryEntryPage)} />
            <Route path="/itinerary" element={renderPage(ItineraryPage)} />
            <Route path="/itinerary/new" element={renderPage(ItineraryFormPage)} />
            <Route path="/itinerary/:itemId/edit" element={renderPage(ItineraryFormPage)} />
            <Route path="/tips" element={renderPage(TipsPage)} />
            <Route path="/tips/new" element={renderPage(TipFormPage)} />
            <Route path="/tips/:tipId/edit" element={renderPage(TipFormPage)} />
            <Route path="/hotels" element={renderPage(HotelsPage)} />
            <Route path="/hotels/new" element={renderPage(HotelFormPage)} />
            <Route path="/hotels/:hotelId/edit" element={renderPage(HotelFormPage)} />
            <Route path="/vehicles" element={renderPage(VehiclesPage)} />
            <Route path="/vehicles/new" element={renderPage(VehicleFormPage)} />
            <Route path="/vehicles/:vehicleId/edit" element={renderPage(VehicleFormPage)} />
            <Route path="/expenses" element={renderPage(ExpensesPage)} />
            <Route path="/expenses/new" element={renderPage(ExpenseFormPage)} />
            <Route path="/expenses/:expenseId/edit" element={renderPage(ExpenseFormPage)} />
            <Route path="/agenda" element={renderPage(AgendaPage)} />
            <Route path="/agenda/new" element={renderPage(AgendaFormPage)} />
            <Route path="/agenda/:eventId/edit" element={renderPage(AgendaFormPage)} />
            <Route path="/alarms" element={renderPage(AlarmsPage)} />
            <Route path="/alarms/new" element={renderPage(AlarmFormPage)} />
            <Route path="/alarms/:alarmId/edit" element={renderPage(AlarmFormPage)} />
            <Route path="/notifications" element={renderPage(NotificationsPage)} />
            <Route path="/reviews" element={renderPage(ReviewsPage)} />
            <Route path="/emergency" element={renderPage(EmergencyPage)} />
            <Route path="/emergency/new" element={renderPage(EmergencyFormPage)} />
            <Route path="/emergency/:contactId/edit" element={renderPage(EmergencyFormPage)} />
            <Route path="/settings" element={renderPage(SettingsPage)} />
            <Route element={<AdminRoute />}>
              <Route path="/admin" element={renderPage(AdminPanelPage)} />
              <Route path="/expenses/import" element={renderPage(ExpenseImportPage)} />
              <Route path="/members/manage" element={renderPage(MemberFormPage)} />
              <Route path="/members/manage/:memberId" element={renderPage(MemberFormPage)} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default AppRoutes
