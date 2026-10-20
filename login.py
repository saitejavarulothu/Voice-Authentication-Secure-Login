import os
import json
import hashlib
from pathlib import Path

# Simple Voice Authentication System (Educational)
# This demonstrates the concept without requiring audio hardware

class VoiceAuthenticationSystem:
    """
    Simple Voice Authentication System
    - Enrollment: Record and store voice profile
    - Authentication: Verify voice against stored profile
    """
    
    def __init__(self, data_file="voice_profiles.json"):
        self.data_file = data_file
        self.users = self.load_profiles()
    
    def load_profiles(self):
        """Load existing voice profiles from file"""
        if os.path.exists(self.data_file):
            with open(self.data_file, 'r') as f:
                return json.load(f)
        return {}
    
    def save_profiles(self):
        """Save voice profiles to file"""
        with open(self.data_file, 'w') as f:
            json.dump(self.users, f, indent=4)
    
    def create_voice_signature(self, passphrase, user_id):
        """
        Create a voice signature (simulated)
        In real system: Extract MFCCs, spectrograms, etc.
        """
        # Simulate voice signature with hash + user metadata
        signature = hashlib.sha256(
            f"{passphrase}{user_id}".encode()
        ).hexdigest()
        
        return {
            "passphrase": passphrase,
            "signature": signature,
            "attempt": 1
        }
    
    def enroll_user(self, username, passphrase):
        """
        Enroll a new user with voice authentication
        User speaks a phrase multiple times
        """
        if username in self.users:
            return False, "❌ User already exists!"
        
        print(f"\n🎤 ENROLLMENT MODE - {username}")
        print("=" * 50)
        print(f"Please repeat the phrase: '{passphrase}'")
        print("(In real system, this would record audio)")
        print("\nSimulating voice capture...")
        
        # Simulate multiple voice samples
        voice_samples = []
        for i in range(3):
            print(f"  Sample {i+1}/3: Recording...")
            signature = self.create_voice_signature(passphrase, username)
            voice_samples.append(signature)
        
        # Store user profile
        self.users[username] = {
            "passphrase": passphrase,
            "voice_profiles": voice_samples,
            "status": "enrolled",
            "attempts": 0,
            "locked": False
        }
        
        self.save_profiles()
        return True, f"✅ {username} enrolled successfully!"
    
    def authenticate_user(self, username, passphrase):
        """
        Authenticate user by voice
        Compare voice signature with stored profiles
        """
        if username not in self.users:
            return False, "❌ User not found!"
        
        user = self.users[username]
        
        # Check if account is locked
        if user.get("locked"):
            return False, "❌ Account locked! Too many failed attempts."
        
        print(f"\n🎤 AUTHENTICATION MODE - {username}")
        print("=" * 50)
        print(f"Please say the phrase: '{user['passphrase']}'")
        print("(In real system, this would record audio)")
        print("Analyzing voice...")
        
        # Simulate voice authentication
        test_signature = self.create_voice_signature(passphrase, username)
        
        # Compare with stored profiles
        match_found = False
        confidence = 0
        
        for stored_profile in user["voice_profiles"]:
            if test_signature["signature"] == stored_profile["signature"]:
                match_found = True
                confidence = 95  # High confidence match
                break
            else:
                # Simulate similarity score (0-100)
                confidence = 45  # Low confidence
        
        # Update attempt counter
        user["attempts"] = user.get("attempts", 0) + 1
        
        if match_found or (passphrase == user["passphrase"] and confidence >= 85):
            user["attempts"] = 0
            self.save_profiles()
            return True, f"✅ Authentication successful! Confidence: {confidence}%"
        else:
            if user["attempts"] >= 3:
                user["locked"] = True
                self.save_profiles()
                return False, "❌ Authentication failed! Account locked."
            
            remaining = 3 - user["attempts"]
            self.save_profiles()
            return False, f"❌ Voice not recognized! ({remaining} attempts remaining)"
    
    def unlock_account(self, username, admin_password="admin123"):
        """Unlock a locked account (admin only)"""
        if username not in self.users:
            return False, "❌ User not found!"
        
        if admin_password != "admin123":
            return False, "❌ Invalid admin password!"
        
        self.users[username]["locked"] = False
        self.users[username]["attempts"] = 0
        self.save_profiles()
        return True, f"✅ {username} account unlocked!"
    
    def change_passphrase(self, username, old_passphrase, new_passphrase):
        """Change voice authentication passphrase"""
        if username not in self.users:
            return False, "❌ User not found!"
        
        user = self.users[username]
        
        if user["passphrase"] != old_passphrase:
            return False, "❌ Current passphrase incorrect!"
        
        user["passphrase"] = new_passphrase
        user["voice_profiles"] = []
        
        print(f"\n🎤 RE-ENROLLMENT REQUIRED")
        print("=" * 50)
        print("Please say the new phrase 3 times...")
        
        for i in range(3):
            print(f"  Sample {i+1}/3: Recording...")
            signature = self.create_voice_signature(new_passphrase, username)
            user["voice_profiles"].append(signature)
        
        self.save_profiles()
        return True, "✅ Passphrase changed successfully!"
    
    def list_users(self):
        """List all enrolled users"""
        if not self.users:
            return "No users enrolled yet."
        
        user_list = "\n👥 ENROLLED USERS:\n" + "=" * 50 + "\n"
        for username, data in self.users.items():
            status = "🔒 LOCKED" if data.get("locked") else "✅ ACTIVE"
            user_list += f"  {username:15} | {status}\n"
        
        return user_list
    
    def delete_user(self, username, admin_password="admin123"):
        """Delete a user account"""
        if admin_password != "admin123":
            return False, "❌ Invalid admin password!"
        
        if username not in self.users:
            return False, "❌ User not found!"
        
        del self.users[username]
        self.save_profiles()
        return True, f"✅ {username} account deleted!"


def print_menu():
    """Display main menu"""
    print("\n" + "=" * 50)
    print("🎤 VOICE AUTHENTICATION SYSTEM")
    print("=" * 50)
    print("1. Enroll New User")
    print("2. Authenticate User")
    print("3. Change Passphrase")
    print("4. List Users")
    print("5. Unlock Account (Admin)")
    print("6. Delete User (Admin)")
    print("7. Exit")
    print("=" * 50)


def main():
    """Main program loop"""
    system = VoiceAuthenticationSystem()
    
    print("\n🔐 WELCOME TO VOICE AUTHENTICATION SYSTEM")
    print("=" * 50)
    print("Educational Project - CyberSecurity")
    print("=" * 50)
    
    while True:
        print_menu()
        choice = input("\nEnter your choice (1-7): ").strip()
        
        if choice == "1":
            # Enroll new user
            username = input("Enter username: ").strip()
            passphrase = input("Enter passphrase to speak: ").strip()
            
            if not username or not passphrase:
                print("❌ Username and passphrase cannot be empty!")
                continue
            
            success, message = system.enroll_user(username, passphrase)
            print(f"\n{message}")
        
        elif choice == "2":
            # Authenticate user
            username = input("Enter username: ").strip()
            passphrase = input("Speak the phrase: ").strip()
            
            success, message = system.authenticate_user(username, passphrase)
            print(f"\n{message}")
            
            if success:
                print("\n✅ LOGIN SUCCESSFUL!")
                print(f"Welcome back, {username}! 🎉")
        
        elif choice == "3":
            # Change passphrase
            username = input("Enter username: ").strip()
            old_passphrase = input("Enter current passphrase: ").strip()
            new_passphrase = input("Enter new passphrase: ").strip()
            
            success, message = system.change_passphrase(
                username, old_passphrase, new_passphrase
            )
            print(f"\n{message}")
        
        elif choice == "4":
            # List users
            print(system.list_users())
        
        elif choice == "5":
            # Unlock account
            username = input("Enter username to unlock: ").strip()
            admin_pass = input("Enter admin password: ").strip()
            
            success, message = system.unlock_account(username, admin_pass)
            print(f"\n{message}")
        
        elif choice == "6":
            # Delete user
            username = input("Enter username to delete: ").strip()
            admin_pass = input("Enter admin password: ").strip()
            confirm = input(f"Are you sure? (yes/no): ").strip().lower()
            
            if confirm == "yes":
                success, message = system.delete_user(username, admin_pass)
                print(f"\n{message}")
            else:
                print("❌ Deletion cancelled!")
        
        elif choice == "7":
            print("\n👋 Goodbye! Thank you for using Voice Authentication System")
            break
        
        else:
            print("❌ Invalid choice! Please enter 1-7")
        
        input("\nPress Enter to continue...")


if __name__ == "__main__":
    main()