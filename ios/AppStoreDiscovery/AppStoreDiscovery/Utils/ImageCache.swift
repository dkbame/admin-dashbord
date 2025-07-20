//
//  ImageCache.swift
//  AppStoreDiscovery
//
//  Created by iMac on 13/7/2025.
//

import SwiftUI

// MARK: - Image Cache Manager
class ImageCache {
    static let shared = ImageCache()
    private let cache = NSCache<NSString, UIImage>()
    private let fileManager = FileManager.default
    private let cacheDirectory: URL
    
    init() {
        cache.countLimit = 10 // Limit memory usage
        cache.totalCostLimit = 50 * 1241024 // MB limit
        
        // Create cache directory
        let paths = fileManager.urls(for: .cachesDirectory, in: .userDomainMask)
        cacheDirectory = paths[0].appendingPathComponent("ImageCache")
        
        try? fileManager.createDirectory(at: cacheDirectory, withIntermediateDirectories: true)
    }
    
    func getImage(for url: String) -> UIImage? {
        // Check memory cache first
        if let cachedImage = cache.object(forKey: url as NSString) {
            return cachedImage
        }
        
        // Check disk cache
        let fileName = url.addingPercentEncoding(withAllowedCharacters: .urlHostAllowed) ?? url
        let fileURL = cacheDirectory.appendingPathComponent(fileName)
        
        if let data = try? Data(contentsOf: fileURL), let image = UIImage(data: data) {
            // Store in memory cache
            cache.setObject(image, forKey: url as NSString)
            return image
        }
        
        return nil
    }
    
    func setImage(_ image: UIImage, for url: String) {
        // Store in memory cache
        cache.setObject(image, forKey: url as NSString)
        
        // Store in disk cache
        let fileName = url.addingPercentEncoding(withAllowedCharacters: .urlHostAllowed) ?? url
        let fileURL = cacheDirectory.appendingPathComponent(fileName)
        
        if let data = image.jpegData(compressionQuality: 0.8) {
            try? data.write(to: fileURL)
        }
    }
    
    func clearCache() {
        cache.removeAllObjects()
        try? fileManager.removeItem(at: cacheDirectory)
        try? fileManager.createDirectory(at: cacheDirectory, withIntermediateDirectories: true)
    }
} 