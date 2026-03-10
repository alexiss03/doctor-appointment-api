import Foundation

struct APIClient {
    // Default to deployed Render backend; override in scheme env with API_BASE_URL for local runs.
    var baseURL: URL = URL(
        string: ProcessInfo.processInfo.environment["API_BASE_URL"] ?? "https://doctor-appointment-api-esie.onrender.com"
    )!

    private let decoder: JSONDecoder = {
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .useDefaultKeys
        return decoder
    }()

    func login(email: String, password: String) async throws -> User {
        let body = ["email": email, "password": password]
        let response: LoginResponse = try await request(path: "/api/auth/login", method: "POST", body: body)
        return response.user
    }

    func me() async throws -> User {
        let response: UserResponse = try await request(path: "/api/me")
        return response.user
    }

    func doctors() async throws -> [Doctor] {
        let response: DoctorsResponse = try await request(path: "/api/doctors")
        return response.doctors
    }

    func categories() async throws -> [String] {
        let response: CategoriesResponse = try await request(path: "/api/categories")
        return response.categories
    }

    func symptoms() async throws -> [String] {
        let response: SymptomsResponse = try await request(path: "/api/symptoms")
        return response.symptoms
    }

    func favorites() async throws -> [Doctor] {
        let response: DoctorsResponse = try await request(path: "/api/favorites")
        return response.doctors
    }

    func toggleFavorite(doctorId: String) async throws {
        let _: EmptyResponse = try await request(path: "/api/favorites/\(doctorId)", method: "POST")
    }

    func appointments() async throws -> [Appointment] {
        let response: AppointmentsResponse = try await request(path: "/api/appointments")
        return response.appointments
    }

    func createAppointment(doctorId: String, date: String, time: String, reason: String) async throws -> Appointment {
        let body: [String: String] = [
            "doctorId": doctorId,
            "date": date,
            "time": time,
            "reason": reason
        ]
        let response: AppointmentResponse = try await request(path: "/api/appointments", method: "POST", body: body)
        return response.appointment
    }

    func updateAppointment(id: String, status: String? = nil, date: String? = nil, time: String? = nil) async throws {
        var body: [String: String] = [:]
        if let status {
            body["status"] = status
        }
        if let date {
            body["date"] = date
        }
        if let time {
            body["time"] = time
        }
        let _: AppointmentResponse = try await request(path: "/api/appointments/\(id)", method: "PATCH", body: body)
    }

    func chats() async throws -> [ChatSummary] {
        let response: ChatsResponse = try await request(path: "/api/chats")
        return response.chats
    }

    func chatMessages(doctorId: String) async throws -> [ChatMessage] {
        let response: ChatMessagesResponse = try await request(path: "/api/chats/\(doctorId)/messages")
        return response.messages
    }

    func sendMessage(doctorId: String, text: String) async throws -> [ChatMessage] {
        let body = ["text": text]
        let response: ChatMessagesResponse = try await request(path: "/api/chats/\(doctorId)/messages", method: "POST", body: body)
        return response.messages
    }

    private func request<T: Decodable>(path: String, method: String = "GET", body: [String: String]? = nil) async throws -> T {
        guard let url = URL(string: path, relativeTo: baseURL) else {
            throw APIError.invalidResponse
        }
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let body {
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
        }

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        guard 200..<300 ~= http.statusCode else {
            if let error = try? decoder.decode(APIErrorResponse.self, from: data) {
                throw APIError.server(error.error)
            }
            throw APIError.server("Request failed with code \(http.statusCode)")
        }

        if T.self == EmptyResponse.self {
            return EmptyResponse() as! T
        }

        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            throw APIError.decoding(error.localizedDescription)
        }
    }
}

struct EmptyResponse: Codable {}

struct APIErrorResponse: Codable {
    let error: String
}

enum APIError: LocalizedError {
    case invalidResponse
    case server(String)
    case decoding(String)

    var errorDescription: String? {
        switch self {
        case .invalidResponse:
            return "Invalid server response."
        case .server(let message):
            return message
        case .decoding(let message):
            return "Failed to decode server response: \(message)"
        }
    }
}
