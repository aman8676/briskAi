import unittest

from metadata import extract_document_metadata


class BundleUploadMetadataTests(unittest.TestCase):
    def test_extract_document_metadata_for_bundle_includes_file_list(self):
        metadata = extract_document_metadata(
            "C:/fake/path/pharma_bundle.zip",
            text="This bundle covers leave policy and amendments for employees.",
            source_label="pharma_bundle",
            bundle_files=[
                "policy/leave_policy.txt",
                "amendments/2024_refresh.txt",
                "handbook/employee_rules.md",
            ],
        )

        self.assertEqual(metadata["title"], "pharma_bundle")
        self.assertEqual(metadata["source"], "pharma_bundle")
        self.assertEqual(metadata["source_path"], "pharma_bundle")
        self.assertIn("policy/leave_policy.txt", metadata["index_markdown"])
        self.assertIn("amendments/2024_refresh.txt", metadata["index_markdown"])
        self.assertIn("Total files", metadata["index_markdown"])


if __name__ == "__main__":
    unittest.main()
