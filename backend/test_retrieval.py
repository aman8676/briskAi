from database import SessionLocal
from retrieval import retrieve_context


USER_ID = 7  # Replace with an existing user ID from your database.
QUERY = "What are the termination conditions in the agreement?"


def run_retrieval_test() -> None:
    """Manually test the current retrieval pipeline for one user."""
    db = SessionLocal()
    try:
        context, is_relevant = retrieve_context(QUERY, USER_ID, db)
        print("Query:", QUERY)
        print("Relevant:", is_relevant)
        print("Context:\n", context)
    finally:
        db.close()


if __name__ == "__main__":
    run_retrieval_test()
