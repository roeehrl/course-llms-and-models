"""Executable negative controls for the private authoring/verification protocol."""
import copy
import importlib.util
import json
import math
import pathlib
import subprocess
import unittest

ROOT=pathlib.Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('authoring',ROOT/'verification/adaptation-authoring.py')
author=importlib.util.module_from_spec(spec);spec.loader.exec_module(author)


class AuthoredRecovery(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.course,cls.overlay,cls.bank=author.build_payload()

    def test_every_declared_variable_domain_has_an_independent_reference_and_wrong_key_control(self):
        self.assertEqual(author.verify_math(),895)
        self.assertEqual(len(self.overlay['adaptation']['families']),112)
        self.assertEqual(len(self.overlay['adaptation']['targets']),56)

    def test_default_generated_artifact_survives_released_sdk_digest_and_actual_verification(self):
        artifact,_=author.make_artifact(self.course,self.overlay,'ada-01-04-numeric-0',0)
        result=author.verify_artifact(self.course,self.overlay,artifact,0)
        self.assertTrue(all(c['result']=='passed' for c in result['checks']))
        self.assertEqual(result['publicationAuthority'],'not_granted')
        self.assertEqual(result['proofAuthenticity'],'not_checked')

    def test_wrong_keys_family_scope_sources_prompt_and_extra_authority_cannot_be_rehashed_into_approval(self):
        artifact,_=author.make_artifact(self.course,self.overlay,'ada-01-04-numeric-0',0)
        mutations=[lambda a:a['assessment']['grading'].update(expected=a['assessment']['grading']['expected']+1),
                   lambda a:a['assessment'].update(familyId='invented-family'),
                   lambda a:a.update(objectiveIds=['unrelated-objective']),
                   lambda a:a.update(sourceRefs=['unapproved-source']),
                   lambda a:a['assessment'].update(prompt='Changed numerical task.'),
                   lambda a:a.update(publicationAuthority='granted')]
        for mutate in mutations:
            changed=copy.deepcopy(artifact);mutate(changed)
            # Rehashing is deliberately attempted. A digest alone is not proof.
            if 'publicationAuthority' not in changed:
                changed['digest']=author.node_sdk('digest',changed)
            with self.assertRaises(ValueError):author.verify_artifact(self.course,self.overlay,changed,0)

    def test_choice_answer_changes_and_arbitrary_variants_are_rejected(self):
        artifact,_=author.make_artifact(self.course,self.overlay,'ada-02-04-choice-0',0)
        wrong=copy.deepcopy(artifact);wrong['assessment']['grading']['correctOptionId']=next(o['id'] for o in wrong['assessment']['options'] if o['id']!=wrong['assessment']['grading']['correctOptionId'])
        wrong['digest']=author.node_sdk('digest',wrong)
        with self.assertRaises(ValueError):author.verify_artifact(self.course,self.overlay,wrong,0)
        with self.assertRaises(ValueError):author.make_artifact(self.course,self.overlay,'ada-02-04-choice-0',1)

    def test_recipe_exhaustion_and_wrong_ordinal_are_explicit(self):
        task=author.NUMERIC['01-01'];_,total=author.variable_space(task)
        with self.assertRaises(ValueError):author.instantiate_values(task,total)
        with self.assertRaises(ValueError):author.instantiate_values(task,-1)
        artifact,_=author.make_artifact(self.course,self.overlay,'ada-01-01-numeric-0',1)
        with self.assertRaises(ValueError):author.verify_artifact(self.course,self.overlay,artifact,0)

    def test_cli_generate_verify_reference_and_invalid_reference_are_actual_subprocesses(self):
        command=['python3',str(ROOT/'verification/adaptation-authoring.py')]
        generated=subprocess.run(command+['--generate','ada-01-01-numeric-0','--ordinal','2'],capture_output=True,text=True,timeout=30,check=True)
        verified=subprocess.run(command+['--verify','--ordinal','2'],input=generated.stdout,capture_output=True,text=True,timeout=30,check=True)
        self.assertEqual(json.loads(verified.stdout)['publicationAuthority'],'not_granted')
        good={'templateId':'ada-recipe-01-01','variables':{'dw':2,'db':3,'x':4}}
        output=subprocess.run(command+['--reference'],input=json.dumps(good),capture_output=True,text=True,timeout=30,check=True)
        self.assertEqual(json.loads(output.stdout),-11)
        good['variables']['x']=999
        rejected=subprocess.run(command+['--reference'],input=json.dumps(good),capture_output=True,text=True,timeout=30)
        self.assertNotEqual(rejected.returncode,0)


if __name__=='__main__':unittest.main()
