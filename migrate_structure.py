import os
import shutil
from pathlib import Path

def main():
    # Define the root of the project
    # Assumes this script is placed in f:\Projects\edu_assistant\
    base_dir = Path(__file__).parent.resolve()
    print(f"Running migration in: {base_dir}")

    # Define moves: (Source Relative Path, Destination Relative Path)
    moves = [
        ("frontend/src/pages/datacourse/PathWay.jsx", "frontend/src/pages/discover/PathWay.jsx"),
        ("frontend/src/pages/datacourse/IntroductionPage.jsx", "frontend/src/pages/program/IntroductionPage.jsx"),
    ]
    
    for src_str, dst_str in moves:
        src = base_dir / src_str
        dst = base_dir / dst_str
        
        if src.exists():
            # Ensure destination directory exists
            if not dst.parent.exists():
                dst.parent.mkdir(parents=True, exist_ok=True)
            
            shutil.move(str(src), str(dst))
            print(f"✅ Moved: {src_str} -> {dst_str}")
        else:
            print(f"⚠️ Source not found (already moved?): {src_str}")

    # Cleanup empty directory
    old_dir = base_dir / "frontend/src/pages/datacourse"
    if old_dir.exists() and not any(old_dir.iterdir()):
        old_dir.rmdir()
        print(f"🗑️ Removed empty directory: {old_dir}")

if __name__ == "__main__":
    main()