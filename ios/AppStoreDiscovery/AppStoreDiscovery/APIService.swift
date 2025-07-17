//
//  APIService.swift
//  AppStoreDiscovery
//
//  Created by iMac on 13/7/2025.
//

import Foundation
import Supabase

class APIService: ObservableObject {
    @Published var apps: [AppModel] = []
    @Published var categories: [Category] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    func fetchApps() async {
        await MainActor.run {
            isLoading = true
            errorMessage = nil
        }
        do {
            // First, fetch apps without screenshots
            let appsResponse = try await SupabaseManager.shared.client
                .from("apps")
                .select("*")
                .execute()
            
            print("[DEBUG] fetchApps - Apps response status: \(appsResponse.status)")
            
            if appsResponse.status == 200 {
                do {
                    let apps = try JSONDecoder().decode([AppModel].self, from: appsResponse.data)
                    
                    // Now fetch screenshots for each app
                    var appsWithScreenshots: [AppModel] = []
                    
                    for app in apps {
                        let screenshotsResponse = try await SupabaseManager.shared.client
                            .from("screenshots")
                            .select("*")
                            .eq("app_id", value: app.id)
                            .order("display_order")
                            .execute()
                        
                        print("[DEBUG] Screenshots for app \(app.name) (ID: \(app.id)):")
                        print("[DEBUG] Screenshots response status: \(screenshotsResponse.status)")
                        
                        if screenshotsResponse.status == 200 {
                            let screenshots = try JSONDecoder().decode([Screenshot].self, from: screenshotsResponse.data)
                            print("[DEBUG] Found \(screenshots.count) screenshots for \(app.name)")
                            
                            // Create a new app model with screenshots
                            let appWithScreenshots = AppModel(
                                id: app.id,
                                name: app.name,
                                description: app.description,
                                developer: app.developer,
                                price: app.price,
                                category_id: app.category_id,
                                icon_url: app.icon_url,
                                screenshots: screenshots,
                                app_store_url: app.app_store_url,
                                website_url: app.website_url,
                                version: app.version,
                                size: app.size,
                                rating: app.rating,
                                rating_count: app.rating_count,
                                release_date: app.release_date,
                                last_updated: app.last_updated,
                                is_free: app.is_free,
                                is_featured: app.is_featured,
                                created_at: app.created_at,
                                updated_at: app.updated_at
                            )
                            appsWithScreenshots.append(appWithScreenshots)
                        } else {
                            print("[DEBUG] Failed to fetch screenshots for \(app.name)")
                            appsWithScreenshots.append(app)
                        }
                    }
                    
                    // Debug: Check screenshots for each app
                    for (index, app) in appsWithScreenshots.enumerated() {
                        print("[DEBUG] App \(index): \(app.name)")
                        print("[DEBUG] App \(index) screenshots count: \(app.screenshots?.count ?? 0)")
                        if let screenshots = app.screenshots {
                            for (screenshotIndex, screenshot) in screenshots.enumerated() {
                                print("[DEBUG] Screenshot \(screenshotIndex): \(screenshot.url)")
                            }
                        }
                    }
                    
                    let finalApps = appsWithScreenshots
                    await MainActor.run {
                        self.apps = finalApps
                        self.isLoading = false
                    }
                } catch let decodingError {
                    print("[DEBUG] JSON Decoding Error: \(decodingError)")
                    if let decodingError = decodingError as? DecodingError {
                        switch decodingError {
                        case .keyNotFound(let key, let context):
                            print("[DEBUG] Missing key: \(key.stringValue) at path: \(context.codingPath)")
                        case .typeMismatch(let type, let context):
                            print("[DEBUG] Type mismatch: expected \(type) at path: \(context.codingPath)")
                        case .valueNotFound(let type, let context):
                            print("[DEBUG] Value not found: expected \(type) at path: \(context.codingPath)")
                        case .dataCorrupted(let context):
                            print("[DEBUG] Data corrupted at path: \(context.codingPath)")
                        @unknown default:
                            print("[DEBUG] Unknown decoding error")
                        }
                    }
                    await MainActor.run {
                        self.errorMessage = "Decoding Error: \(decodingError.localizedDescription)"
                        self.isLoading = false
                    }
                }
            } else {
                let errorString = String(data: appsResponse.data, encoding: .utf8) ?? "Unknown error (status: \(appsResponse.status))"
                print("[DEBUG] fetchApps - Error: \(errorString)")
                await MainActor.run {
                    self.errorMessage = "Error: \(errorString)"
                    self.isLoading = false
                }
            }
        } catch {
            print("[DEBUG] fetchApps - Exception: \(error.localizedDescription)")
            await MainActor.run {
                self.errorMessage = "Error: \(error.localizedDescription)"
                self.isLoading = false
            }
        }
    }

    func fetchCategories() async {
        await MainActor.run {
            isLoading = true
            errorMessage = nil
        }
        do {
            let response = try await SupabaseManager.shared.client
                .from("categories")
                .select()
                .execute()
            
            // Debug: Print the raw response data from Supabase
            print("[DEBUG] fetchCategories - Raw response data:")
            print(String(data: response.data, encoding: .utf8) ?? "No data or not UTF-8")
            print("[DEBUG] fetchCategories - Status: \(response.status)")

            if response.status == 200 {
                let categories = try JSONDecoder().decode([Category].self, from: response.data)
            await MainActor.run {
                self.categories = categories
                self.isLoading = false
            }
            } else {
                let errorString = String(data: response.data, encoding: .utf8) ?? "Unknown error (status: \(response.status))"
                print("[DEBUG] fetchCategories - Error: \(errorString)")
            await MainActor.run {
                    self.errorMessage = "Error: \(errorString)"
                self.isLoading = false
            }
            }
        } catch {
            print("[DEBUG] fetchCategories - Exception: \(error.localizedDescription)")
            await MainActor.run {
                self.errorMessage = "Error: \(error.localizedDescription)"
                self.isLoading = false
            }
        }
    }
} 