"""Collect release artifacts without losing either macOS architecture's metadata."""
from pathlib import Path
import shutil
import sys
import yaml


def merge_artifacts(root):
    root = Path(root)
    target = root / 'merged'
    target.mkdir(exist_ok=True)
    manifests = {}
    for folder in sorted(root.iterdir()):
        if not folder.is_dir() or folder == target:
            continue
        for file in folder.iterdir():
            if not file.is_file():
                continue
            if file.name.startswith('latest') and file.suffix == '.yml':
                data = yaml.safe_load(file.read_text())
                if not isinstance(data, dict) or not data.get('version') or not data.get('files'):
                    raise ValueError(f'Invalid update manifest: {file.name}')
                if file.name in manifests:
                    previous = manifests[file.name]
                    if previous['version'] != data['version']:
                        raise ValueError('Cannot combine different release versions')
                    existing = {entry['url']: entry for entry in previous['files']}
                    for entry in data['files']:
                        if entry['url'] in existing and existing[entry['url']] != entry:
                            raise ValueError('Conflicting update file metadata')
                        existing[entry['url']] = entry
                    previous['files'] = list(existing.values())
                else:
                    manifests[file.name] = data
            else:
                destination = target / file.name
                if destination.exists() and destination.read_bytes() != file.read_bytes():
                    raise ValueError(f'Conflicting artifact: {file.name}')
                shutil.copy2(file, destination)
    for name, data in manifests.items():
        for entry in data['files']:
            if not (target / entry['url']).is_file():
                raise ValueError(f'Missing update file: {entry["url"]}')
        (target / name).write_text(yaml.safe_dump(data, sort_keys=False))
    if not manifests:
        raise ValueError('No update manifests generated')
    return target


if __name__ == '__main__':
    print(merge_artifacts(sys.argv[1]))
