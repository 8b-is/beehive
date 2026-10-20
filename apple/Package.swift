// swift-tools-version: 5.10
import PackageDescription

let package = Package(
    name: "BeeHive",
    platforms: [
        .macOS(.v13),
        .iOS(.v16)
    ],
    products: [
        .library(name: "BeeHiveKit", targets: ["BeeHiveKit"]),
        .executable(name: "beehive-cli", targets: ["BeeHiveCLI"])
    ],
    targets: [
        .target(
            name: "BeeHiveKit",
            path: "Sources/BeeHiveKit"
        ),
        .executableTarget(
            name: "BeeHiveCLI",
            dependencies: ["BeeHiveKit"],
            path: "Sources/BeeHiveCLI"
        )
    ]
)
