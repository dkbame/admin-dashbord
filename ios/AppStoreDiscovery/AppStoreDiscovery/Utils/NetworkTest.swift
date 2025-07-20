//
//  NetworkTest.swift
//  AppStoreDiscovery
//
//  Created by iMac on 13/7/2025.
//

import Foundation
import UIKit

class NetworkTest {
    static let shared = NetworkTest()
    
    private init() {}
    
    func testScreenshotURL(_ urlString: String, completion: @escaping (Bool, String?) -> Void) {
        guard let url = URL(string: urlString) else {
            completion(false, "Invalid URL")
            return
        }
        
        print("🔍 Testing screenshot URL: \(urlString)")
        
        let task = URLSession.shared.dataTask(with: url) { data, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    print("❌ Network error: \(error.localizedDescription)")
                    completion(false, error.localizedDescription)
                    return
                }
                
                if let httpResponse = response as? HTTPURLResponse {
                    print("📡 HTTP Status: \(httpResponse.statusCode)")
                    if httpResponse.statusCode == 200 {
                        if let data = data {
                            print("✅ Image data received: \(data.count) bytes")
                            if let image = UIImage(data: data) {
                                print("✅ Image loaded successfully: \(image.size)")
                                completion(true, "Success - \(data.count) bytes")
                            } else {
                                print("❌ Failed to create UIImage from data")
                                completion(false, "Invalid image data")
                            }
                        } else {
                            print("❌ No data received")
                            completion(false, "No data")
                        }
                    } else {
                        print("❌ HTTP error: \(httpResponse.statusCode)")
                        completion(false, "HTTP \(httpResponse.statusCode)")
                    }
                } else {
                    print("❌ Invalid response")
                    completion(false, "Invalid response")
                }
            }
        }
        
        task.resume()
    }
    
    func testAllScreenshotURLs(for app: AppModel) {
        print("🧪 Testing all screenshot URLs for app: \(app.name)")
        
        guard let screenshots = app.screenshots, !screenshots.isEmpty else {
            print("⚠️ No screenshots to test")
            return
        }
        
        for (index, screenshot) in screenshots.enumerated() {
            testScreenshotURL(screenshot.url) { success, message in
                print("📱 Screenshot \(index + 1): \(success ? "✅" : "❌") \(message ?? "Unknown")")
            }
        }
    }
} 