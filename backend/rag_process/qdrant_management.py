from qdrant_client import QdrantClient, models

client = QdrantClient(url="http://localhost:6333")

client.update_collection_aliases(
    change_aliases_operations=[
        models.CreateAliasOperation(
            create_alias=models.CreateAlias(
                collection_name="ldc_assistant",
                alias_name="ldc_assistant_gemini"
            )
        )
    ]
)