import Foundation

@MainActor
final class AppViewModel: ObservableObject {
    @Published var user: User?
    @Published var doctors: [Doctor] = []
    @Published var categories: [String] = []
    @Published var symptoms: [String] = []
    @Published var favoriteDoctorIds: Set<String> = []
    @Published var appointments: [Appointment] = []
    @Published var chats: [ChatSummary] = []
    @Published var selectedChatDoctorId: String?
    @Published var messages: [ChatMessage] = []

    @Published var selectedCategory: String = ""
    @Published var searchText: String = ""
    @Published var appointmentTab: String = "scheduled"
    @Published var lastBookedDoctorName: String?

    @Published var errorMessage: String?
    @Published var isLoading = false

    let api = APIClient()

    func bootstrap() async {
        do {
            user = try await api.me()
            try await refreshAll()
        } catch {
            user = nil
        }
    }

    func login(email: String, password: String) async {
        isLoading = true
        defer { isLoading = false }
        do {
            user = try await api.login(email: email, password: password)
            try await refreshAll()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func refreshDashboard() async {
        do {
            try await refreshAll()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func refreshAll() async throws {
        async let doctorsTask = api.doctors()
        async let categoriesTask = api.categories()
        async let symptomsTask = api.symptoms()
        async let favoritesTask = api.favorites()
        async let appointmentsTask = api.appointments()
        async let chatsTask = api.chats()

        doctors = try await doctorsTask
        categories = try await categoriesTask
        symptoms = try await symptomsTask
        appointments = try await appointmentsTask
        chats = try await chatsTask

        let favorites = try await favoritesTask
        favoriteDoctorIds = Set(favorites.map(\.id))

        if selectedChatDoctorId == nil {
            selectedChatDoctorId = chats.first?.doctor.id
        }
        if let selectedChatDoctorId {
            messages = try await api.chatMessages(doctorId: selectedChatDoctorId)
        }
    }

    var filteredDoctors: [Doctor] {
        doctors.filter { doctor in
            let matchesCategory = selectedCategory.isEmpty || doctor.category == selectedCategory
            let term = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
            let matchesSearch = term.isEmpty ||
                doctor.name.localizedCaseInsensitiveContains(term) ||
                doctor.specialty.localizedCaseInsensitiveContains(term) ||
                doctor.category.localizedCaseInsensitiveContains(term) ||
                doctor.symptoms.joined(separator: " ").localizedCaseInsensitiveContains(term)
            return matchesCategory && matchesSearch
        }
    }

    var favoriteDoctors: [Doctor] {
        doctors.filter { favoriteDoctorIds.contains($0.id) }
    }

    var filteredAppointments: [Appointment] {
        appointments.filter { $0.status == appointmentTab }
    }

    func toggleFavorite(_ doctor: Doctor) async {
        do {
            try await api.toggleFavorite(doctorId: doctor.id)
            if favoriteDoctorIds.contains(doctor.id) {
                favoriteDoctorIds.remove(doctor.id)
            } else {
                favoriteDoctorIds.insert(doctor.id)
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func bookAppointment(doctor: Doctor, date: Date, time: String, reason: String) async -> Bool {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        let dateString = formatter.string(from: date)

        do {
            _ = try await api.createAppointment(doctorId: doctor.id, date: dateString, time: time, reason: reason)
            appointments = try await api.appointments()
            lastBookedDoctorName = doctor.name
            return true
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }

    func updateAppointment(_ appointment: Appointment, status: String? = nil, date: String? = nil, time: String? = nil) async {
        do {
            try await api.updateAppointment(id: appointment.id, status: status, date: date, time: time)
            appointments = try await api.appointments()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func openChat(doctorId: String) async {
        selectedChatDoctorId = doctorId
        do {
            messages = try await api.chatMessages(doctorId: doctorId)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func sendMessage(_ text: String) async {
        guard let selectedChatDoctorId, !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            return
        }

        do {
            messages = try await api.sendMessage(doctorId: selectedChatDoctorId, text: text)
            chats = try await api.chats()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func doctor(for appointment: Appointment) -> Doctor? {
        appointment.doctor ?? doctors.first(where: { $0.id == appointment.doctorId })
    }

    func doctor(by id: String) -> Doctor? {
        doctors.first(where: { $0.id == id })
    }

    func clearError() {
        errorMessage = nil
    }
}
