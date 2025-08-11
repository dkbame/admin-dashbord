import Foundation

struct Screenshot: Identifiable, Codable, Equatable {
    let id: String
    let url: String
    let width: Int?
    let height: Int?
    let caption: String?
    
    // Computed properties
    var aspectRatio: Double {
        guard let width = width, let height = height, height > 0 else { return 16.0/9.0 }
        return Double(width) / Double(height)
    }
    
    var isLandscape: Bool {
        return aspectRatio > 1.0
    }
    
    var isPortrait: Bool {
        return aspectRatio < 1.0
    }
    
    var isSquare: Bool {
        return abs(aspectRatio - 1.0) < 0.1
    }
}
