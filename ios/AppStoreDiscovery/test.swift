let data = try! JSONSerialization.jsonObject(with: Data(contentsOf: URL(string: "https://YOUR_SUPABASE_URL/rest/v1/apps?select=*,categories(name)")!))
print(data)
