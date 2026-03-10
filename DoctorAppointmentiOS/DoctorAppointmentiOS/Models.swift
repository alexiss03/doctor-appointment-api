import Foundation

struct User: Codable, Identifiable {
    let id: String
    let name: String
    let email: String
}

struct Doctor: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let specialty: String
    let experience: Int
    let fee: Int
    let location: String
    let rating: Double
    let category: String
    let symptoms: [String]
    let bio: String
    let availableSlots: [String]
    let chatAvailable: Bool
    let image: String
    var favorite: Bool?
}

struct Appointment: Codable, Identifiable {
    let id: String
    let userId: String
    let doctorId: String
    var date: String
    var time: String
    var status: String
    var reason: String
    var doctor: Doctor?
}

struct ChatSummary: Codable {
    let doctor: Doctor
    let favorite: Bool
    let lastMessage: ChatMessage?
    let messageCount: Int
}

struct ChatMessage: Codable, Identifiable {
    let id: String
    let sender: String
    let text: String
    let time: String
}

struct LoginResponse: Codable {
    let message: String
    let user: User
}

struct UserResponse: Codable {
    let user: User
}

struct DoctorsResponse: Codable {
    let doctors: [Doctor]
}

struct CategoriesResponse: Codable {
    let categories: [String]
}

struct SymptomsResponse: Codable {
    let symptoms: [String]
}

struct AppointmentsResponse: Codable {
    let appointments: [Appointment]
}

struct AppointmentResponse: Codable {
    let appointment: Appointment
}

struct ChatsResponse: Codable {
    let chats: [ChatSummary]
}

struct ChatMessagesResponse: Codable {
    let doctor: Doctor
    let messages: [ChatMessage]
}
