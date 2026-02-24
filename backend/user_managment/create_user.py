import psycopg2
import bcrypt
import getpass
import sys

# Configuration (Matches your Docker Compose mapping)
DB_CONFIG = {
    "host": "localhost",
    "port": 5432,        # PostgreSQL default port
    "user": "postgres",  # Default Postgres user
    "password": "abvn1234",
    "database": "app_db"
}

def get_access_rights():
    """Display a menu for selecting access rights."""
    print("\n--- Select Access Rights ---")
    options = {
        "1": "full_access",
        "2": "mhdm",
        "3": "orm",
        "4": "cstd",
        "5": "gstid",
        "6": "rrtt"
    }
    
    for key, value in options.items():
        print(f"  {key}. {value}")
    
    while True:
        choice = input("Enter choice (1-6) [Default: 6]: ").strip()
        if not choice:
            return "rrtt" # Default
        if choice in options:
            return options[choice]
        print("Invalid choice. Please try again.")

def create_user():
    print("--- Admin User Creation Tool (PostgreSQL) ---")
    
    # 1. Collect User Info
    email = input("Enter new user email: ").strip()
    if not email:
        print("❌ Email is required.")
        return

    full_name = input("Enter full name: ").strip()
    department = input("Enter Department Name (e.g. IT, Risk, Finance): ").strip()
    
    # 2. Select Access Rights
    access_rights = get_access_rights()
    print(f"🔹 Selected Rights: {access_rights}")

    # 3. Password Handling
    password = getpass.getpass("Enter password: ")
    confirm_password = getpass.getpass("Confirm password: ")
    
    if password != confirm_password:
        print("❌ Passwords do not match!")
        return

    # 4. Hash the password
    # bcrypt.hashpw requires bytes, so we encode the password
    hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    # Decode back to string for storage in Postgres TEXT/VARCHAR column
    hashed_str = hashed.decode('utf-8')

    conn = None
    try:
        # 5. Connect to PostgreSQL
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()

        # 6. Insert into DB (Targeting the 'user_management' schema)
        query = """
            INSERT INTO user_management.users 
            (email, full_name, department, access_rights, password_hash) 
            VALUES (%s, %s, %s, %s, %s)
        """
        
        cursor.execute(query, (email, full_name, department, access_rights, hashed_str))
        conn.commit()
        
        print(f"\n✅ Success! User '{email}' created with access '{access_rights}'.")

    except psycopg2.Error as err:
        print(f"\n❌ Database Error: {err}")
        if conn:
            conn.rollback()
            
    except Exception as e:
        print(f"\n❌ Unexpected Error: {e}")
        
    finally:
        if conn:
            cursor.close()
            conn.close()

if __name__ == "__main__":
    create_user()