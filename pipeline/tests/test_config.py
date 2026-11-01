from review_intel import config


def test_repo_root_contains_plan():
    assert (config.REPO_ROOT / "PLAN.md").exists()


def test_label_map_covers_all_ratings_with_known_labels():
    assert set(config.LABEL_MAP) == {1, 2, 3, 4, 5}
    assert set(config.LABEL_MAP.values()) == set(config.LABELS)


def test_sample_sizes_are_ordered():
    assert config.DEV_PER_DOMAIN < config.PER_DOMAIN_SAMPLE
    assert config.PER_DOMAIN_SAMPLE * len(config.DOMAINS) == config.ANALYSIS_SAMPLE_SIZE
    assert config.SERVING_CORPUS_SIZE < config.ANALYSIS_SAMPLE_SIZE


def test_three_demo_domains():
    assert config.DOMAINS == ("restaurant", "grocery", "appliances")


def test_amazon_categories_belong_to_known_domains():
    assert set(config.AMAZON_CATEGORIES) <= set(config.DOMAINS)
    assert config.AMAZON_CATEGORIES["grocery"] == "Grocery_and_Gourmet_Food"


def test_split_fractions_sum_to_one():
    assert set(config.SPLITS) == {"train", "val", "test"}
    assert abs(sum(config.SPLITS.values()) - 1.0) < 1e-9


def test_artifact_folders_live_inside_the_repo():
    for path in (config.RAW_DIR, config.MODELS_DIR, config.REPORTS_DIR):
        assert config.REPO_ROOT in path.parents


def test_data_and_models_are_gitignored():
    ignored = (config.REPO_ROOT / ".gitignore").read_text(encoding="utf-8").splitlines()
    assert "/data/" in ignored
    assert "pipeline/models/" in ignored


def test_gpu_budget_is_set():
    assert 0 < config.MODAL_BUDGET_USD <= 5
