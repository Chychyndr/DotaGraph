"""Inspect the official STRATZ schema for exact-rank bulk collection."""
import json
import os

from dotagraph_pipeline.stratz_preview import query_stratz


def main() -> None:
    token = os.environ.get('STRATZ_API_TOKEN', '').strip()
    ref = 'kind name ofType { kind name ofType { kind name ofType { kind name } } }'
    fields = f'fields {{ name args {{ name type {{ {ref} }} }} type {{ {ref} }} }}'
    root = query_stratz(f'__schema {{ queryType {{ name {fields} }} }}', token)
    query = root['__schema']['queryType']
    relevant = [row for row in query['fields'] if 'match' in row['name'].lower() or row['name'] == 'heroStats']
    print(json.dumps({'query': relevant}, indent=2))
    for row in relevant:
        if row['name'] != 'heroStats':
            continue
        kind = row['type']
        while not kind.get('name'):
            kind = kind['ofType']
        value = query_stratz(f'__type(name: {json.dumps(kind["name"])}) {{ name {fields} }}', token)['__type']
        print(json.dumps({'heroStats': value}, indent=2))
        inputs = set()
        for field in value['fields']:
            if 'match' not in field['name'].lower():
                continue
            for arg in field['args']:
                kind = arg['type']
                while not kind.get('name'):
                    kind = kind['ofType']
                if kind['kind'] in ('INPUT_OBJECT', 'ENUM'):
                    inputs.add(kind['name'])
        for name in sorted(inputs):
            value = query_stratz(f'__type(name: {json.dumps(name)}) {{ name inputFields {{ name type {{ {ref} }} }} enumValues {{ name }} }}', token)
            print(json.dumps(value, indent=2))


if __name__ == '__main__':
    main()
