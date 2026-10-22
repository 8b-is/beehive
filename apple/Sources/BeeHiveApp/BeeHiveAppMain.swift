#if canImport(SwiftUI)
import SwiftUI
import BeeHiveKit

@available(macOS 13.0, iOS 16.0, *)
@main
struct BeeHiveAppLauncher: App {
    var body: some Scene {
        WindowGroup {
            TabView {
                BeeHiveDashboardView()
                    .tabItem { Label("Hive", systemImage: "hexagon") }
                BeeHiveWebUIView()
                    .tabItem { Label("QuantT + App", systemImage: "location") }
            }
        }
    }
}
#endif
