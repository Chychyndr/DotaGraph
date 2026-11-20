import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

from scripts.collect_immortal import main
from dotagraph_pipeline.config import CURRENT_SCOPE


class ImmortalCommandTests(unittest.TestCase):
    def test_persists_completed_interval_before_later_failure_and_resumes(self):
        with TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / 'public/data/current-matchups.json'
            source.parent.mkdir(parents=True)
            source.write_text(json.dumps({
                'patch': CURRENT_SCOPE.patch,
                'scope': {'observationWindowEndExclusive': '2026-11-20T12:00:00Z'},
            }))
            output = root / 'artifacts/immortal/current-matchups.json'

            def collect(payload, *args, **kwargs):
                payload['stratzImmortalHistory'] = {
                    'matchCount': 1000, 'candidateCount': 2000, 'backlogSeconds': 100,
                }
                return 100

            with (
                patch('scripts.collect_immortal.Path.cwd', return_value=root),
                patch('scripts.collect_immortal._load_catalog', return_value=set()),
                patch('scripts.collect_immortal._load_opendota_hero_map', return_value={}),
                patch.dict('os.environ', {'STRATZ_API_TOKEN': 'test-token'}),
                patch('sys.argv', ['collect_immortal.py']),
                patch('scripts.collect_immortal.add_stratz_evidence') as enrich,
            ):
                calls = 0
                def fail_after_first(payload, *args, **kwargs):
                    nonlocal calls
                    calls += 1
                    if calls == 2:
                        raise RuntimeError('provider unavailable')
                    return collect(payload)
                enrich.side_effect = fail_after_first
                with self.assertRaisesRegex(RuntimeError, 'provider unavailable'):
                    main()
                self.assertEqual(json.loads(output.read_text())['stratzImmortalHistory']['matchCount'], 1000)

                def resume(payload, *args, **kwargs):
                    self.assertEqual(payload['stratzImmortalHistory']['matchCount'], 1000)
                    payload['stratzImmortalHistory'].update(matchCount=2000, backlogSeconds=0)
                    return 200
                enrich.side_effect = resume
                with patch('sys.argv', ['collect_immortal.py', '--input', str(output)]):
                    main()
                self.assertEqual(json.loads(output.read_text())['stratzImmortalHistory']['matchCount'], 2000)
