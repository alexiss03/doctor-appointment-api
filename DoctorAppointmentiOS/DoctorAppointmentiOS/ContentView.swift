import SwiftUI

struct RootView: View {
    @EnvironmentObject private var vm: AppViewModel

    var body: some View {
        Group {
            if vm.user == nil {
                LoginView()
            } else {
                MainTabView()
            }
        }
        .alert("Error", isPresented: Binding(get: { vm.errorMessage != nil }, set: { _ in vm.clearError() })) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(vm.errorMessage ?? "Unknown error")
        }
    }
}

struct LoginView: View {
    @EnvironmentObject private var vm: AppViewModel
    @State private var email = "mary@example.com"
    @State private var password = "password123"

    var body: some View {
        VStack(spacing: 16) {
            Spacer()
            Text("Doc Time Saver")
                .font(.largeTitle.bold())
            Text("Native iOS")
                .foregroundStyle(.secondary)

            TextField("Email", text: $email)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .padding(12)
                .background(.thinMaterial)
                .clipShape(RoundedRectangle(cornerRadius: 12))

            SecureField("Password", text: $password)
                .padding(12)
                .background(.thinMaterial)
                .clipShape(RoundedRectangle(cornerRadius: 12))

            Button {
                Task { await vm.login(email: email, password: password) }
            } label: {
                Text(vm.isLoading ? "Logging In..." : "Log In")
                    .frame(maxWidth: .infinity)
                    .padding(12)
            }
            .buttonStyle(.borderedProminent)
            .tint(.pink)
            .disabled(vm.isLoading)

            Spacer()
        }
        .padding()
        .background(
            LinearGradient(colors: [.pink.opacity(0.15), .white], startPoint: .topLeading, endPoint: .bottomTrailing)
                .ignoresSafeArea()
        )
    }
}

struct MainTabView: View {
    var body: some View {
        TabView {
            HomeView()
                .tabItem { Label("Home", systemImage: "house") }

            SpecialistsView()
                .tabItem { Label("Specialists", systemImage: "stethoscope") }

            FavoritesView()
                .tabItem { Label("Favorites", systemImage: "heart") }

            AppointmentsView()
                .tabItem { Label("Schedule", systemImage: "calendar") }

            ChatView()
                .tabItem { Label("Chat", systemImage: "message") }
        }
        .tint(.pink)
    }
}

struct HomeView: View {
    @EnvironmentObject private var vm: AppViewModel
    @State private var bookingDoctor: Doctor?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    TextField("Search doctor or issue", text: $vm.searchText)
                        .padding(10)
                        .background(.ultraThinMaterial)
                        .clipShape(RoundedRectangle(cornerRadius: 10))

                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack {
                            CategoryChip(title: "All", isActive: vm.selectedCategory.isEmpty) {
                                vm.selectedCategory = ""
                            }
                            ForEach(vm.categories, id: \.self) { category in
                                CategoryChip(title: category, isActive: vm.selectedCategory == category) {
                                    vm.selectedCategory = category
                                }
                            }
                        }
                    }

                    Text("Most Common Symptoms")
                        .font(.headline)

                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack {
                            ForEach(vm.symptoms.prefix(8), id: \.self) { symptom in
                                Button(symptom) {
                                    vm.searchText = symptom
                                }
                                .padding(.horizontal, 12)
                                .padding(.vertical, 8)
                                .background(Color.gray.opacity(0.12))
                                .clipShape(Capsule())
                                .buttonStyle(.plain)
                            }
                        }
                    }

                    Text("Top Doctors")
                        .font(.headline)

                    ForEach(vm.filteredDoctors.sorted(by: { $0.rating > $1.rating }).prefix(4)) { doctor in
                        NavigationLink {
                            DoctorDetailView(doctor: doctor)
                        } label: {
                            DoctorRow(
                                doctor: doctor,
                                isFavorite: vm.favoriteDoctorIds.contains(doctor.id),
                                onFavorite: { Task { await vm.toggleFavorite(doctor) } },
                                onBook: { bookingDoctor = doctor }
                            )
                        }
                        .buttonStyle(.plain)
                    }

                    NavigationLink {
                        SpecialistsView()
                    } label: {
                        Text("See All Specialists")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)
                }
                .padding()
            }
            .refreshable {
                await vm.refreshDashboard()
            }
            .navigationTitle("Find Doctor")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        Task { await vm.refreshDashboard() }
                    } label: {
                        Image(systemName: "arrow.clockwise")
                    }
                }
            }
        }
        .sheet(item: $bookingDoctor) { doctor in
            BookingView(doctor: doctor)
        }
    }
}

struct SpecialistsView: View {
    @EnvironmentObject private var vm: AppViewModel
    @State private var searchText = ""
    @State private var selectedCategory = ""
    @State private var bookingDoctor: Doctor?

    private var filtered: [Doctor] {
        vm.doctors.filter { doctor in
            let categoryPass = selectedCategory.isEmpty || doctor.category == selectedCategory
            let term = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
            let searchPass = term.isEmpty ||
                doctor.name.localizedCaseInsensitiveContains(term) ||
                doctor.specialty.localizedCaseInsensitiveContains(term) ||
                doctor.category.localizedCaseInsensitiveContains(term)
            return categoryPass && searchPass
        }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                VStack(spacing: 10) {
                    TextField("Search specialist", text: $searchText)
                        .padding(10)
                        .background(.ultraThinMaterial)
                        .clipShape(RoundedRectangle(cornerRadius: 10))

                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack {
                            CategoryChip(title: "All", isActive: selectedCategory.isEmpty) {
                                selectedCategory = ""
                            }
                            ForEach(vm.categories, id: \.self) { category in
                                CategoryChip(title: category, isActive: selectedCategory == category) {
                                    selectedCategory = category
                                }
                            }
                        }
                    }
                }
                .padding([.horizontal, .top])

                List {
                    ForEach(filtered) { doctor in
                        NavigationLink {
                            DoctorDetailView(doctor: doctor)
                        } label: {
                            DoctorRow(
                                doctor: doctor,
                                isFavorite: vm.favoriteDoctorIds.contains(doctor.id),
                                onFavorite: { Task { await vm.toggleFavorite(doctor) } },
                                onBook: { bookingDoctor = doctor }
                            )
                        }
                        .buttonStyle(.plain)
                        .listRowSeparator(.hidden)
                    }
                }
                .listStyle(.plain)
            }
            .navigationTitle("Top Specialists")
            .refreshable {
                await vm.refreshDashboard()
            }
        }
        .sheet(item: $bookingDoctor) { doctor in
            BookingView(doctor: doctor)
        }
    }
}

struct FavoritesView: View {
    @EnvironmentObject private var vm: AppViewModel
    @State private var bookingDoctor: Doctor?

    var body: some View {
        NavigationStack {
            Group {
                if vm.favoriteDoctors.isEmpty {
                    ContentUnavailableView("No Favorites Yet", systemImage: "heart", description: Text("Tap the heart on any doctor to save them."))
                } else {
                    List {
                        ForEach(vm.favoriteDoctors) { doctor in
                            NavigationLink {
                                DoctorDetailView(doctor: doctor)
                            } label: {
                                DoctorRow(
                                    doctor: doctor,
                                    isFavorite: true,
                                    onFavorite: { Task { await vm.toggleFavorite(doctor) } },
                                    onBook: { bookingDoctor = doctor }
                                )
                            }
                            .buttonStyle(.plain)
                            .listRowSeparator(.hidden)
                        }
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("Favorites")
            .refreshable {
                await vm.refreshDashboard()
            }
        }
        .sheet(item: $bookingDoctor) { doctor in
            BookingView(doctor: doctor)
        }
    }
}

struct AppointmentsView: View {
    @EnvironmentObject private var vm: AppViewModel
    @State private var rescheduleAppointment: Appointment?

    var body: some View {
        NavigationStack {
            VStack {
                Picker("Status", selection: $vm.appointmentTab) {
                    Text("Scheduled").tag("scheduled")
                    Text("Completed").tag("completed")
                    Text("Cancelled").tag("cancelled")
                }
                .pickerStyle(.segmented)
                .padding(.horizontal)

                if vm.filteredAppointments.isEmpty {
                    Spacer()
                    ContentUnavailableView(
                        "No Appointments",
                        systemImage: "calendar.badge.exclamationmark",
                        description: Text("Appointments in this tab will show here.")
                    )
                    Spacer()
                } else {
                    List {
                        ForEach(vm.filteredAppointments) { appt in
                            VStack(alignment: .leading, spacing: 8) {
                                Text(vm.doctor(for: appt)?.name ?? "Doctor")
                                    .font(.headline)
                                Text("\(appt.date) at \(appt.time)")
                                    .foregroundStyle(.secondary)
                                Text(appt.reason)
                                    .foregroundStyle(.secondary)

                                if appt.status == "scheduled" {
                                    HStack {
                                        Button("Complete") {
                                            Task { await vm.updateAppointment(appt, status: "completed") }
                                        }
                                        .buttonStyle(.bordered)

                                        Button("Reschedule") {
                                            rescheduleAppointment = appt
                                        }
                                        .buttonStyle(.bordered)

                                        Button("Cancel") {
                                            Task { await vm.updateAppointment(appt, status: "cancelled") }
                                        }
                                        .buttonStyle(.borderedProminent)
                                        .tint(.pink)
                                    }
                                }
                            }
                            .padding(.vertical, 4)
                            .listRowSeparator(.hidden)
                        }
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("Appointments")
            .refreshable {
                await vm.refreshDashboard()
            }
        }
        .sheet(item: $rescheduleAppointment) { appt in
            RescheduleView(appointment: appt)
        }
    }
}

struct RescheduleView: View {
    @EnvironmentObject private var vm: AppViewModel
    @Environment(\.dismiss) private var dismiss

    let appointment: Appointment

    @State private var date = Date()
    @State private var selectedTime = ""

    private var doctor: Doctor? {
        vm.doctor(for: appointment)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Current") {
                    Text("\(appointment.date) at \(appointment.time)")
                }

                Section("New Time") {
                    DatePicker("Date", selection: $date, displayedComponents: .date)
                    Picker("Slot", selection: $selectedTime) {
                        Text("Select slot").tag("")
                        ForEach((doctor?.availableSlots ?? [appointment.time]), id: \.self) { slot in
                            Text(slot).tag(slot)
                        }
                    }
                }
            }
            .navigationTitle("Reschedule")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Close") { dismiss() }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Save") {
                        let formatter = DateFormatter()
                        formatter.dateFormat = "yyyy-MM-dd"
                        let dateString = formatter.string(from: date)
                        Task {
                            await vm.updateAppointment(appointment, status: "scheduled", date: dateString, time: selectedTime)
                            dismiss()
                        }
                    }
                    .disabled(selectedTime.isEmpty)
                }
            }
        }
        .onAppear {
            selectedTime = appointment.time
            if let parsed = parseISODate(appointment.date) {
                date = parsed
            }
        }
    }

    private func parseISODate(_ value: String) -> Date? {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.date(from: value)
    }
}

struct ChatView: View {
    @EnvironmentObject private var vm: AppViewModel
    @State private var draft = ""

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack {
                        ForEach(vm.chats, id: \.doctor.id) { chat in
                            Button {
                                Task { await vm.openChat(doctorId: chat.doctor.id) }
                            } label: {
                                VStack(alignment: .leading) {
                                    Text(chat.doctor.name)
                                        .font(.subheadline.bold())
                                    Text(chat.doctor.specialty)
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                                .padding(10)
                                .background(vm.selectedChatDoctorId == chat.doctor.id ? Color.pink.opacity(0.2) : Color.gray.opacity(0.1))
                                .clipShape(RoundedRectangle(cornerRadius: 10))
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal)
                }
                .padding(.vertical, 8)

                if vm.messages.isEmpty {
                    Spacer()
                    ContentUnavailableView("No Messages", systemImage: "message", description: Text("Select a doctor and start a chat."))
                    Spacer()
                } else {
                    List(vm.messages) { message in
                        VStack(alignment: .leading, spacing: 4) {
                            Text(message.sender == "doctor" ? "Doctor" : "You")
                                .font(.caption.bold())
                            Text(message.text)
                            Text(message.time)
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                        .frame(maxWidth: .infinity, alignment: message.sender == "doctor" ? .leading : .trailing)
                    }
                    .listStyle(.plain)
                }

                HStack {
                    TextField("Type your message", text: $draft)
                        .textFieldStyle(.roundedBorder)
                    Button("Send") {
                        let message = draft
                        draft = ""
                        Task { await vm.sendMessage(message) }
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.pink)
                    .disabled(draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
                .padding()
            }
            .navigationTitle("Chat")
            .task {
                if vm.selectedChatDoctorId == nil, let first = vm.chats.first {
                    await vm.openChat(doctorId: first.doctor.id)
                }
            }
            .refreshable {
                await vm.refreshDashboard()
            }
        }
    }
}

struct DoctorDetailView: View {
    @EnvironmentObject private var vm: AppViewModel
    let doctor: Doctor

    @State private var bookingDoctor: Doctor?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                AsyncImage(url: URL(string: doctor.image)) { image in
                    image
                        .resizable()
                        .scaledToFill()
                } placeholder: {
                    Color.gray.opacity(0.15)
                }
                .frame(height: 220)
                .frame(maxWidth: .infinity)
                .clipShape(RoundedRectangle(cornerRadius: 14))

                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(doctor.name)
                            .font(.title3.bold())
                        Text(doctor.specialty)
                            .foregroundStyle(.secondary)
                        Text("⭐ \(doctor.rating, specifier: "%.1f") • \(doctor.experience) years • \(doctor.location)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }

                    Spacer()

                    Button {
                        Task { await vm.toggleFavorite(doctor) }
                    } label: {
                        Image(systemName: vm.favoriteDoctorIds.contains(doctor.id) ? "heart.fill" : "heart")
                            .foregroundStyle(.pink)
                            .font(.title3)
                    }
                    .buttonStyle(.plain)
                }

                Text("About Doctor")
                    .font(.headline)
                Text(doctor.bio)
                    .foregroundStyle(.secondary)

                Text("Available Slots")
                    .font(.headline)

                LazyVGrid(columns: [GridItem(.adaptive(minimum: 90), spacing: 8)], spacing: 8) {
                    ForEach(doctor.availableSlots, id: \.self) { slot in
                        Text(slot)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 8)
                            .background(Color.pink.opacity(0.12))
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                    }
                }

                Button("Book Appointment") {
                    bookingDoctor = doctor
                }
                .frame(maxWidth: .infinity)
                .buttonStyle(.borderedProminent)
                .tint(.pink)
            }
            .padding()
        }
        .navigationTitle("Doctor Details")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(item: $bookingDoctor) { picked in
            BookingView(doctor: picked)
        }
    }
}

struct BookingView: View {
    @EnvironmentObject private var vm: AppViewModel
    @Environment(\.dismiss) private var dismiss
    let doctor: Doctor

    @State private var date = Date()
    @State private var selectedTime = ""
    @State private var reason = ""
    @State private var showSuccess = false

    var body: some View {
        NavigationStack {
            Group {
                if showSuccess {
                    VStack(spacing: 16) {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 64))
                            .foregroundStyle(.pink)
                        Text("Thank You!")
                            .font(.title.bold())
                        Text("Your appointment with \(vm.lastBookedDoctorName ?? doctor.name) is confirmed.")
                            .multilineTextAlignment(.center)
                            .foregroundStyle(.secondary)

                        Button("Done") { dismiss() }
                            .buttonStyle(.borderedProminent)
                            .tint(.pink)
                    }
                    .padding()
                } else {
                    Form {
                        Section("Doctor") {
                            Text(doctor.name).font(.headline)
                            Text(doctor.specialty).foregroundStyle(.secondary)
                            Text("\(doctor.experience) yrs exp • $\(doctor.fee)")
                                .foregroundStyle(.secondary)
                        }

                        Section("Schedule") {
                            DatePicker("Date", selection: $date, displayedComponents: .date)
                            Picker("Time", selection: $selectedTime) {
                                Text("Select slot").tag("")
                                ForEach(doctor.availableSlots, id: \.self) { slot in
                                    Text(slot).tag(slot)
                                }
                            }
                        }

                        Section("Reason") {
                            TextField("Symptoms or concern", text: $reason, axis: .vertical)
                        }
                    }
                }
            }
            .navigationTitle(showSuccess ? "Confirmed" : "Book Appointment")
            .toolbar {
                if !showSuccess {
                    ToolbarItem(placement: .topBarLeading) {
                        Button("Close") { dismiss() }
                    }
                    ToolbarItem(placement: .topBarTrailing) {
                        Button("Book") {
                            Task {
                                let ok = await vm.bookAppointment(doctor: doctor, date: date, time: selectedTime, reason: reason)
                                if ok {
                                    showSuccess = true
                                }
                            }
                        }
                        .disabled(selectedTime.isEmpty)
                    }
                }
            }
        }
    }
}

struct DoctorRow: View {
    let doctor: Doctor
    let isFavorite: Bool
    let onFavorite: () -> Void
    let onBook: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .top, spacing: 12) {
                AsyncImage(url: URL(string: doctor.image)) { image in
                    image
                        .resizable()
                        .scaledToFill()
                } placeholder: {
                    Color.gray.opacity(0.2)
                }
                .frame(width: 58, height: 58)
                .clipShape(RoundedRectangle(cornerRadius: 10))

                VStack(alignment: .leading, spacing: 4) {
                    Text(doctor.name)
                        .font(.headline)
                    Text(doctor.specialty)
                        .foregroundStyle(.secondary)
                    Text("⭐ \(doctor.rating, specifier: "%.1f") • \(doctor.experience) yrs • \(doctor.location)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                Button {
                    onFavorite()
                } label: {
                    Image(systemName: isFavorite ? "heart.fill" : "heart")
                        .foregroundStyle(.pink)
                }
                .buttonStyle(.plain)
            }

            Button("Make Appointment") {
                onBook()
            }
            .buttonStyle(.borderedProminent)
            .tint(.pink)
        }
        .padding(10)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

struct CategoryChip: View {
    let title: String
    let isActive: Bool
    let action: () -> Void

    var body: some View {
        Button(title) {
            action()
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(isActive ? Color.pink : Color.gray.opacity(0.15))
        .foregroundStyle(isActive ? .white : .primary)
        .clipShape(Capsule())
        .buttonStyle(.plain)
    }
}
