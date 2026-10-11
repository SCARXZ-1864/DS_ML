from review_intel import config


def test_repo_root_contains_plan():
    assert (config.REPO_ROOT / "PLAN.md").exists()


def test_label_map_covers_all_ratings_with_known_labels():
    assert set(config.LABEL_MAP) == {1, 2, 3, 4, 5}
    assert set(config.LABEL_MAP.values()) == set(config.LABELS)


def test_sample_sizes_are_ordered():
    assert config.DEV_SAMPLE_SIZE < config.SERVING_CORPUS_SIZE < config.ANALYSIS_SAMPLE_SIZE
