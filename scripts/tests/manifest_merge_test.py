import importlib.util
from pathlib import Path
import tempfile
import unittest
import yaml

spec = importlib.util.spec_from_file_location('merge', Path(__file__).parents[1] / 'merge_update_manifests.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class ManifestMergeTest(unittest.TestCase):
    def test_both_mac_architectures_are_available(self):
        with tempfile.TemporaryDirectory() as directory:
            for arch in ['x64', 'arm64']:
                folder = Path(directory) / arch
                folder.mkdir()
                name = f'Cutting-{arch}.zip'
                (folder / name).write_bytes(arch.encode())
                (folder / 'latest-mac.yml').write_text(yaml.safe_dump({
                    'version': '0.2.0', 'path': name, 'sha512': arch,
                    'files': [{'url': name, 'sha512': arch, 'size': len(arch)}],
                }))
            merged = module.merge_artifacts(directory)
            data = yaml.safe_load((merged / 'latest-mac.yml').read_text())
            self.assertEqual({item['url'] for item in data['files']}, {'Cutting-x64.zip', 'Cutting-arm64.zip'})

    def test_missing_installer_prevents_publication(self):
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory) / 'windows'
            folder.mkdir()
            (folder / 'latest.yml').write_text(yaml.safe_dump({'version': '0.2.0', 'files': [{'url': 'missing.exe'}]}))
            with self.assertRaises(ValueError):
                module.merge_artifacts(directory)


if __name__ == '__main__':
    unittest.main()
