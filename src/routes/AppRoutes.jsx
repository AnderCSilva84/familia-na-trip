import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from '../layouts/AppLayout'
import AdminRoute from './AdminRoute'
import PrivateRoute from './PrivateRoute'
import LoginPage from '../pages/Auth/LoginPage'
import WelcomePage from '../pages/Auth/WelcomePage'
import DashboardPage from '../pages/Dashboard/DashboardPage'
import MapPage from '../pages/Map/MapPage'
import MembersPage from '../pages/Members/MembersPage'
import MemberFormPage from '../pages/Members/MemberFormPage'
import PollsPage from '../pages/Polls/PollsPage'
import PollFormPage from '../pages/Polls/PollFormPage'
import DiaryPage from '../pages/Diary/DiaryPage'
import NewDiaryEntryPage from '../pages/Diary/NewDiaryEntryPage'
import ItineraryPage from '../pages/Itinerary/ItineraryPage'
import ItineraryFormPage from '../pages/Itinerary/ItineraryFormPage'
import TipsPage from '../pages/Tips/TipsPage'
import TipFormPage from '../pages/Tips/TipFormPage'
import HotelsPage from '../pages/Hotels/HotelsPage'
import HotelFormPage from '../pages/Hotels/HotelFormPage'
import VehiclesPage from '../pages/Vehicles/VehiclesPage'
import VehicleFormPage from '../pages/Vehicles/VehicleFormPage'
import ExpensesPage from '../pages/Expenses/ExpensesPage'
import ExpenseImportPage from '../pages/Expenses/ExpenseImportPage'
import ExpenseFormPage from '../pages/Expenses/ExpenseFormPage'
import AdminPanelPage from '../pages/Admin/AdminPanelPage'
import AgendaPage from '../pages/Agenda/AgendaPage'
import AgendaFormPage from '../pages/Agenda/AgendaFormPage'
import AlarmsPage from '../pages/Agenda/AlarmsPage'
import AlarmFormPage from '../pages/Agenda/AlarmFormPage'
import NotificationsPage from '../pages/Notifications/NotificationsPage'
import SettingsPage from '../pages/Settings/SettingsPage'
import ReviewsPage from '../pages/Reviews/ReviewsPage'
import EmergencyPage from '../pages/Emergency/EmergencyPage'
import EmergencyFormPage from '../pages/Emergency/EmergencyFormPage'

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/login" element={<LoginPage />} />

        <Route element={<PrivateRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/members" element={<MembersPage />} />
            <Route path="/polls" element={<PollsPage />} />
            <Route path="/polls/new" element={<PollFormPage />} />
            <Route path="/diary" element={<DiaryPage />} />
            <Route path="/diary/new" element={<NewDiaryEntryPage />} />
            <Route path="/diary/:entryId/edit" element={<NewDiaryEntryPage />} />
            <Route path="/itinerary" element={<ItineraryPage />} />
            <Route path="/itinerary/new" element={<ItineraryFormPage />} />
            <Route path="/itinerary/:itemId/edit" element={<ItineraryFormPage />} />
            <Route path="/tips" element={<TipsPage />} />
            <Route path="/tips/new" element={<TipFormPage />} />
            <Route path="/tips/:tipId/edit" element={<TipFormPage />} />
            <Route path="/hotels" element={<HotelsPage />} />
            <Route path="/hotels/new" element={<HotelFormPage />} />
            <Route path="/hotels/:hotelId/edit" element={<HotelFormPage />} />
            <Route path="/vehicles" element={<VehiclesPage />} />
            <Route path="/vehicles/new" element={<VehicleFormPage />} />
            <Route path="/vehicles/:vehicleId/edit" element={<VehicleFormPage />} />
            <Route path="/expenses" element={<ExpensesPage />} />
            <Route path="/expenses/new" element={<ExpenseFormPage />} />
            <Route path="/expenses/:expenseId/edit" element={<ExpenseFormPage />} />
            <Route path="/agenda" element={<AgendaPage />} />
            <Route path="/agenda/new" element={<AgendaFormPage />} />
            <Route path="/agenda/:eventId/edit" element={<AgendaFormPage />} />
            <Route path="/alarms" element={<AlarmsPage />} />
            <Route path="/alarms/new" element={<AlarmFormPage />} />
            <Route path="/alarms/:alarmId/edit" element={<AlarmFormPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/reviews" element={<ReviewsPage />} />
            <Route path="/emergency" element={<EmergencyPage />} />
            <Route path="/emergency/new" element={<EmergencyFormPage />} />
            <Route path="/emergency/:contactId/edit" element={<EmergencyFormPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<AdminPanelPage />} />
              <Route path="/expenses/import" element={<ExpenseImportPage />} />
              <Route path="/members/manage" element={<MemberFormPage />} />
              <Route path="/members/manage/:memberId" element={<MemberFormPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default AppRoutes
