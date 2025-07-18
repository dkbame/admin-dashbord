#!/usr/bin/env swift

import Foundation
import AppKit
import CoreGraphics

// iOS App Icon Generator
// This script generates all required iOS app icon sizes from a single high-resolution image

struct IconSize {
    let name: String
    let size: Int
    let scale: Int
    
    var pixelSize: Int {
        return size * scale
    }
    
    var filename: String {
        return "Icon-\(size)x\(size)@\(scale)x.png"
    }
}

class IconGenerator {
    static let requiredSizes: [IconSize] = [
        // iPhone
        IconSize(name: "iPhone Notification", size: 20, scale: 2),
        IconSize(name: "iPhone Notification", size: 20, scale: 3),
        IconSize(name: "iPhone Settings", size: 29, scale: 2),
        IconSize(name: "iPhone Settings", size: 29, scale: 3),
        IconSize(name: "iPhone Spotlight", size: 40, scale: 2),
        IconSize(name: "iPhone Spotlight", size: 40, scale: 3),
        IconSize(name: "iPhone App", size: 60, scale: 2),
        IconSize(name: "iPhone App", size: 60, scale: 3),
        
        // iPad
        IconSize(name: "iPad Notifications", size: 20, scale: 1),
        IconSize(name: "iPad Notifications", size: 20, scale: 2),
        IconSize(name: "iPad Settings", size: 29, scale: 1),
        IconSize(name: "iPad Settings", size: 29, scale: 2),
        IconSize(name: "iPad Spotlight", size: 40, scale: 1),
        IconSize(name: "iPad Spotlight", size: 40, scale: 2),
        IconSize(name: "iPad App", size: 76, scale: 1),
        IconSize(name: "iPad App", size: 76, scale: 2),
        IconSize(name: "iPad Pro App", size: 83, scale: 2),
        
        // App Store
        IconSize(name: "App Store", size: 1024, scale: 1)
    ]
    
    static func generateIcons(from sourceImagePath: String, outputDirectory: String) {
        guard let sourceImage = NSImage(contentsOfFile: sourceImagePath) else {
            print("❌ Error: Could not load source image from \(sourceImagePath)")
            return
        }
        
        // Create output directory if it doesn't exist
        let fileManager = FileManager.default
        if !fileManager.fileExists(atPath: outputDirectory) {
            try? fileManager.createDirectory(atPath: outputDirectory, withIntermediateDirectories: true)
        }
        
        print("🎨 Generating iOS app icons...")
        print("📁 Output directory: \(outputDirectory)")
        print("")
        
        for iconSize in requiredSizes {
            if let resizedImage = resizeImage(sourceImage, to: CGSize(width: iconSize.pixelSize, height: iconSize.pixelSize)) {
                let outputPath = "\(outputDirectory)/\(iconSize.filename)"
                
                if saveImage(resizedImage, to: outputPath) {
                    print("✅ Generated: \(iconSize.filename) (\(iconSize.pixelSize)x\(iconSize.pixelSize))")
                } else {
                    print("❌ Failed to save: \(iconSize.filename)")
                }
            } else {
                print("❌ Failed to resize: \(iconSize.filename)")
            }
        }
        
        print("")
        print("🎉 Icon generation complete!")
        print("📋 Next steps:")
        print("1. Add the generated icons to your Xcode project")
        print("2. Update your Info.plist with the icon filenames")
        print("3. Clean and rebuild your project")
    }
    
    private static func resizeImage(_ image: NSImage, to size: CGSize) -> NSImage? {
        let newImage = NSImage(size: size)
        newImage.lockFocus()
        
        image.draw(in: NSRect(origin: .zero, size: size))
        newImage.unlockFocus()
        
        return newImage
    }
    
    private static func saveImage(_ image: NSImage, to path: String) -> Bool {
        guard let tiffData = image.tiffRepresentation,
              let bitmapImage = NSBitmapImageRep(data: tiffData),
              let pngData = bitmapImage.representation(using: .png, properties: [:]) else {
            return false
        }
        
        do {
            try pngData.write(to: URL(fileURLWithPath: path))
            return true
        } catch {
            print("Error saving image: \(error)")
            return false
        }
    }
}

// MARK: - Simple Icon Creator
class SimpleIconCreator {
    static func createSimpleIcon(size: Int, outputPath: String) {
        let image = NSImage(size: NSSize(width: size, height: size))
        image.lockFocus()
        
        // Create a modern gradient background
        let gradient = NSGradient(colors: [
            NSColor(red: 0.2, green: 0.6, blue: 1.0, alpha: 1.0), // Blue
            NSColor(red: 0.4, green: 0.2, blue: 0.8, alpha: 1.0)  // Purple
        ])
        
        let rect = NSRect(origin: .zero, size: NSSize(width: size, height: size))
        gradient?.draw(in: rect, angle: 45)
        
        // Add a simple app icon symbol
        let symbolSize = Double(size) * 0.4
        let symbolRect = NSRect(
            x: Double(size - Int(symbolSize)) / 2,
            y: Double(size - Int(symbolSize)) / 2,
            width: symbolSize,
            height: symbolSize
        )
        
        // Draw a simple "A" symbol for App Store Discovery
        let attributes: [NSAttributedString.Key: Any] = [
            .font: NSFont.boldSystemFont(ofSize: symbolSize * 0.6),
            .foregroundColor: NSColor.white
        ]
        
        let text = "A"
        let textSize = text.size(withAttributes: attributes)
        let textRect = NSRect(
            x: symbolRect.midX - textSize.width / 2,
            y: symbolRect.midY - textSize.height / 2,
            width: textSize.width,
            height: textSize.height
        )
        
        text.draw(in: textRect, withAttributes: attributes)
        
        image.unlockFocus()
        
        // Save the image
        if let tiffData = image.tiffRepresentation,
           let bitmapImage = NSBitmapImageRep(data: tiffData),
           let pngData = bitmapImage.representation(using: .png, properties: [:]) {
            try? pngData.write(to: URL(fileURLWithPath: outputPath))
            print("✅ Created simple icon: \(outputPath)")
        }
    }
}

// MARK: - Main Execution
func main() {
    let arguments = CommandLine.arguments
    
    if arguments.count < 2 {
        print("📱 iOS App Icon Generator")
        print("")
        print("Usage:")
        print("  swift IconGenerator.swift <source_image_path> [output_directory]")
        print("  swift IconGenerator.swift --create-simple [output_directory]")
        print("")
        print("Examples:")
        print("  swift IconGenerator.swift icon.png ./AppIcons")
        print("  swift IconGenerator.swift --create-simple ./AppIcons")
        print("")
        print("Note: Source image should be at least 1024x1024 pixels for best results")
        return
    }
    
    let outputDirectory = arguments.count > 2 ? arguments[2] : "./AppIcons"
    
    if arguments[1] == "--create-simple" {
        print("🎨 Creating simple app icon...")
        SimpleIconCreator.createSimpleIcon(size: 1024, outputPath: "\(outputDirectory)/simple_icon_1024.png")
        print("")
        print("Now run: swift IconGenerator.swift \(outputDirectory)/simple_icon_1024.png \(outputDirectory)")
    } else {
        let sourceImagePath = arguments[1]
        IconGenerator.generateIcons(from: sourceImagePath, outputDirectory: outputDirectory)
    }
}

main() 