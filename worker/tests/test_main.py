from app.main import main


def test_main_runs_without_error(capsys: object) -> None:
    main()
