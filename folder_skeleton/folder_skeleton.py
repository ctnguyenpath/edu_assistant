import os

def print_tree(startpath):
    # Folders to ignore (add any others you want to skip)
    ignore_dirs = {'.git', '__pycache__', '.idea', 'venv', 'env', 'node_modules'}
    
    for root, dirs, files in os.walk(startpath):
        # Modify dirs in-place to skip ignored folders
        dirs[:] = [d for d in dirs if d not in ignore_dirs]
        
        level = root.replace(startpath, '').count(os.sep)
        indent = '│   ' * (level - 1) + '├── ' if level > 0 else ''
        
        print(f"{indent}{os.path.basename(root)}/")
        
        subindent = '│   ' * level + '├── '
        for i, f in enumerate(files):
            # Check if it's the last file to change the prefix
            if i == len(files) - 1:
                prefix = '│   ' * level + '└── '
            else:
                prefix = subindent
            print(f"{prefix}{f}")

if __name__ == "__main__":
    # Change '.' to the path of your folder if the script is not inside it
    # Example: path = "D:/Projects/AI_test"
    path = "." 
    
    print(f"Structure for: {os.path.abspath(path)}\n")
    print_tree(fr'/Volumes/Data/projects/edu_assistant')