import os
import zipfile
import shutil
import random
from pathlib import Path

def setup_dataset():
    project_dir = Path(__file__).resolve().parent
    dataset_dir = project_dir / "dataset"
    zip_path = dataset_dir / "Injury Images.folder.zip"
    extracted_dir = dataset_dir / "extracted"
    split_dir = dataset_dir / "split"

    print("Step 1: Extracting zip file...")
    if extracted_dir.exists():
        shutil.rmtree(extracted_dir)
    extracted_dir.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        zip_ref.extractall(extracted_dir)
    print("Extraction completed.")

    # Locate the train folder inside extracted
    train_src = extracted_dir / "train"
    if not train_src.exists():
        # Maybe it extracted directly or under a subfolder, let's search
        train_src = None
        for p in extracted_dir.glob("**/train"):
            if p.is_dir():
                train_src = p
                break
    
    if not train_src:
        raise FileNotFoundError("Could not find 'train' folder inside the extracted zip.")

    # Copy normal images to train_src / "normal"
    normal_src = dataset_dir / "normal_images"
    dest_normal = train_src / "normal"
    if dest_normal.exists():
        shutil.rmtree(dest_normal)
    dest_normal.mkdir(parents=True, exist_ok=True)
    
    if normal_src.exists():
        print(f"Copying normal images from {normal_src} to {dest_normal}...")
        for img in normal_src.iterdir():
            if img.is_file() and img.suffix.lower() in ['.jpg', '.jpeg', '.png']:
                shutil.copy(img, dest_normal / img.name)
    else:
        print("Warning: normal_images folder not found!")

    classes = ["burns", "snakebites", "wounds", "normal"]
    
    # Create split train/val directories
    train_dest = split_dir / "train"
    val_dest = split_dir / "val"

    if split_dir.exists():
        shutil.rmtree(split_dir)
        
    for cls in classes:
        (train_dest / cls).mkdir(parents=True, exist_ok=True)
        (val_dest / cls).mkdir(parents=True, exist_ok=True)

    print("Step 2: Splitting dataset into train (85%) and val (15%)...")
    random.seed(42)  # For reproducibility

    for cls in classes:
        cls_dir = train_src / cls
        if not cls_dir.exists():
            print(f"Warning: class folder {cls} not found in {train_src}")
            continue
            
        images = [f for f in cls_dir.iterdir() if f.is_file() and f.suffix.lower() in ['.jpg', '.jpeg', '.png']]
        random.shuffle(images)
        
        split_idx = int(len(images) * 0.85)
        train_images = images[:split_idx]
        val_images = images[split_idx:]
        
        print(f"Class '{cls}': {len(train_images)} train images, {len(val_images)} val images")
        
        for img in train_images:
            shutil.copy(img, train_dest / cls / img.name)
        for img in val_images:
            shutil.copy(img, val_dest / cls / img.name)

    print("Dataset split completed successfully.")
    return split_dir

def train_yolo(data_dir):
    from ultralytics import YOLO
    
    print("Step 3: Loading pre-trained YOLOv8n-cls model...")
    model = YOLO("yolov8n-cls.pt")
    
    print("Step 4: Starting training...")
    # workers=0 is safer on Windows to prevent multiprocessing errors
    model.train(
        data=str(data_dir.resolve()),
        epochs=10,
        imgsz=224,
        batch=16,
        workers=0,
        project="injury_classification",
        name="yolov8_train",
        exist_ok=True
    )
    
    print("Training completed.")
    
    # Locate the best model weights
    project_dir = Path(__file__).resolve().parent
    best_weights = project_dir / "runs" / "classify" / "injury_classification" / "yolov8_train" / "weights" / "best.pt"
    
    if best_weights.exists():
        dest_weights = project_dir / "yolov8_injury_cls.pt"
        shutil.copy(best_weights, dest_weights)
        print(f"Model saved successfully to: {dest_weights}")
    else:
        print("Warning: best.pt weights not found. Check training output.")

if __name__ == "__main__":
    split_dir = setup_dataset()
    train_yolo(split_dir)
