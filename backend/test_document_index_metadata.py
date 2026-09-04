from metadata import extract_document_metadata


def test_extract_document_metadata_keeps_nested_source_path():
    """Metadata should preserve the real source path inside a ZIP or folder upload."""
    source_label = "folder/subfolder/contract.txt"

    metadata = extract_document_metadata(
        "C:/fake/path/contract.txt",
        text="This agreement covers pricing and onboarding.",
        source_label=source_label,
    )

    assert metadata["source"] == source_label
    assert metadata["source_path"] == source_label
    assert "pricing" in " ".join(metadata["key_points"]).lower()
